import { useState, useRef } from 'react'
import { X, Loader2, Layers, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { api } from '../../api/client'
import type { ScanJobStatus } from '../../types'

interface ScanDialogProps {
  open: boolean
  onClose: () => void
  onScanComplete: () => void
}

type ScanMode = 'single' | 'all'

export function ScanDialog({ open, onClose, onScanComplete }: ScanDialogProps) {
  const [mode, setMode] = useState<ScanMode>('single')
  const [imageName, setImageName] = useState('')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanId, setScanId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<ScanJobStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  if (!open) return null

  const handleModeSwitch = (newMode: ScanMode) => {
    setMode(newMode)
    setError('')
    setImageName('')
    setJobStatus(null)
  }

  const startPolling = (sid: string) => {
    let attempts = 0
    const maxAttempts = 300 // 10 min at 2s interval
    const interval = setInterval(() => {
      attempts++

      api.scans.getStatus(sid).then(status => {
        setJobStatus(status)

        if (status.status === 'complete' || status.status === 'failed') {
          clearInterval(interval)
          setScanning(false)
          onScanComplete()
        }
      }).catch(() => {
        if (attempts >= maxAttempts) {
          clearInterval(interval)
          setScanning(false)
          onScanComplete()
        }
      })

      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setScanning(false)
        onScanComplete()
      }
    }, 2000)

    pollRef.current = interval
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'single' && !imageName.trim()) {
      setError('Please enter an image name')
      return
    }

    setError('')
    setScanning(true)
    setJobStatus(null)

    try {
      let sid: string
      if (mode === 'single') {
        const resp = await api.scans.create(imageName.trim())
        sid = resp.scan_id
      } else {
        const resp = await api.scans.scanAll()
        sid = resp.scan_id
      }
      setScanId(sid)
      startPolling(sid)
    } catch (err: any) {
      setError(err.message || 'Failed to start scan')
      setScanning(false)
    }
  }

  const handleClose = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setScanning(false)
    setJobStatus(null)
    onScanComplete()
    onClose()
  }

  const getProgress = () => {
    if (!jobStatus) return 0
    if (jobStatus.status === 'complete') return 100
    if (jobStatus.status === 'failed') return 100
    if (jobStatus.total_images && jobStatus.total_images > 0) {
      return Math.round((jobStatus.scanned_images / jobStatus.total_images) * 95)
    }
    return 15 // running but unknown progress
  }

  const getStatusDisplay = () => {
    if (!jobStatus) return { text: 'Scan queued...', icon: <Loader2 className="w-12 h-12 animate-spin text-sidebar-active mx-auto mb-3" /> }

    switch (jobStatus.status) {
      case 'queued':
        return { text: 'Waiting to start...', icon: <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-3" /> }
      case 'running':
        return {
          text: jobStatus.message || 'Scanning...',
          icon: <Loader2 className="w-12 h-12 animate-spin text-sidebar-active mx-auto mb-3" />,
        }
      case 'complete':
        return {
          text: jobStatus.message || 'Scan complete',
          icon: <CheckCircle className="w-12 h-12 text-risk-safe mx-auto mb-3" />,
        }
      case 'failed':
        return {
          text: jobStatus.message || 'Scan failed',
          icon: <AlertCircle className="w-12 h-12 text-critical mx-auto mb-3" />,
        }
      default:
        return { text: 'Unknown state', icon: <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" /> }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !scanning && onClose()}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Scan</h3>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={scanning}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!scanning ? (
            <>
              {/* Mode Selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors ${
                    mode === 'single'
                      ? 'border-sidebar-active bg-blue-50 text-sidebar-active'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => handleModeSwitch('single')}
                >
                  Single Image
                </button>
                <button
                  type="button"
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                    mode === 'all'
                      ? 'border-sidebar-active bg-blue-50 text-sidebar-active'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => handleModeSwitch('all')}
                >
                  <Layers className="w-4 h-4" />
                  All Images
                </button>
              </div>

              {mode === 'single' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Docker Image
                  </label>
                  <input
                    type="text"
                    value={imageName}
                    onChange={(e) => setImageName(e.target.value)}
                    placeholder="e.g., nginx:latest, python:3.11-slim"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-active focus:border-transparent"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a Docker image name to scan for vulnerabilities
                  </p>
                  {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-1">Scan All Local Images</p>
                  <p className="text-xs text-gray-500">
                    This will scan every Docker image found locally. May take several minutes.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-sidebar-active rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {mode === 'all' ? 'Scan All Images' : 'Start Scan'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                {statusDisplay.icon}
                <p className="text-sm font-medium text-gray-900">
                  {mode === 'all' && !jobStatus ? 'Scanning all local images' : mode === 'single' ? `Scanning ${imageName}` : ''}
                </p>
                <p className="text-xs text-gray-500 mt-1">{statusDisplay.text}</p>
              </div>
              <Progress value={getProgress()} className="h-3" />
              {jobStatus && jobStatus.total_images && jobStatus.total_images > 0 && (
                <p className="text-xs text-center text-gray-500">
                  {jobStatus.scanned_images}/{jobStatus.total_images} images scanned
                  {jobStatus.vulns_found > 0 && ` — ${jobStatus.vulns_found} vulnerabilities found`}
                </p>
              )}
              {scanId && (
                <p className="text-xs text-center text-gray-400 font-mono">Scan ID: {scanId}</p>
              )}
              {jobStatus && (jobStatus.status === 'complete' || jobStatus.status === 'failed') && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-sidebar-active rounded-lg hover:bg-blue-600 transition-colors"
                    onClick={handleClose}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
