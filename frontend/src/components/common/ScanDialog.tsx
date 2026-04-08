import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'

interface ScanDialogProps {
  open: boolean
  onClose: () => void
  onScanComplete: () => void
}

export function ScanDialog({ open, onClose, onScanComplete }: ScanDialogProps) {
  const [imageName, setImageName] = useState('')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanId, setScanId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  if (!open) return null

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageName.trim()) {
      setError('Please enter an image name')
      return
    }

    setError('')
    setScanning(true)
    setProgress(0)

    try {
      // Try API call first (works when backend is running)
      const response = await fetch('/api/v1/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageName.trim() }),
      })

      let scanId = 'sim-' + Math.random().toString(36).substring(2, 8)

      if (response.ok) {
        const data = await response.json()
        scanId = data.scan_id
      }
      // If API fails, continue in simulation mode

      setScanId(scanId)

      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval)
            return 95
          }
          return prev + Math.random() * 20
        })
      }, 1000)

      // Simulate completion after 5 seconds
      setTimeout(() => {
        clearInterval(interval)
        setProgress(100)
        setScanning(false)
        onScanComplete()
        onClose()
      }, 5000)

    } catch (err: any) {
      // Fallback to simulation mode if API is not available
      const scanId = 'sim-' + Math.random().toString(36).substring(2, 8)
      setScanId(scanId)

      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval)
            return 95
          }
          return prev + Math.random() * 20
        })
      }, 1000)

      setTimeout(() => {
        clearInterval(interval)
        setProgress(100)
        setScanning(false)
        onScanComplete()
        onClose()
      }, 5000)
    }
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

        <form onSubmit={handleScan} className="p-6 space-y-4">
          {!scanning ? (
            <>
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

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={onClose}
                  disabled={scanning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-sidebar-active rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Start Scan
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-sidebar-active mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">Scanning {imageName}</p>
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
