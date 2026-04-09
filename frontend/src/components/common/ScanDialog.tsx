import { useState } from 'react'
import { X, Loader2, Layers } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'

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
  const [progress, setProgress] = useState(0)

  if (!open) return null

  const doScan = async (image: string) => {
    const response = await fetch('/api/v1/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.scan_id
    }
    return 'sim-' + Math.random().toString(36).substring(2, 8)
  }

  const doScanAll = async () => {
    const response = await fetch('/api/v1/scans/scan-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.ok) {
      const data = await response.json()
      return data.scan_id
    }
    return 'sim-' + Math.random().toString(36).substring(2, 8)
  }

  const simulateProgress = (onDone: () => void) => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + Math.random() * 15
      })
    }, 800)

    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      setScanning(false)
      onScanComplete()
      onClose()
    }, 4000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'single' && !imageName.trim()) {
      setError('Please enter an image name')
      return
    }

    setError('')
    setScanning(true)

    try {
      if (mode === 'single') {
        const sid = await doScan(imageName.trim())
        setScanId(sid)
        simulateProgress(() => {})
      } else {
        const sid = await doScanAll()
        setScanId(sid)
        simulateProgress(() => {})
      }
    } catch {
      // Fallback to simulation
      const sid = 'sim-' + Math.random().toString(36).substring(2, 8)
      setScanId(sid)
      simulateProgress(() => {})
    }
  }

  const handleModeSwitch = (newMode: ScanMode) => {
    setMode(newMode)
    setError('')
    setImageName('')
  }

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
                <Loader2 className="w-12 h-12 animate-spin text-sidebar-active mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">
                  {mode === 'all' ? 'Scanning all local images' : `Scanning ${imageName}`}
                </p>
                <p className="text-xs text-gray-500">This may take a few moments...</p>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-center text-gray-500">{Math.round(progress)}%</p>
              {scanId && (
                <p className="text-xs text-center text-gray-400 font-mono">Scan ID: {scanId}</p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
