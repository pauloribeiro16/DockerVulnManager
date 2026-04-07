import { RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'

interface ScanButtonProps {
  onScan: () => void
  scanning: boolean
  progress?: number
}

export function ScanButton({ onScan, scanning, progress }: ScanButtonProps) {
  if (scanning) {
    return (
      <div className="flex items-center gap-3">
        <Progress value={progress || 0} className="w-32" />
        <span className="text-sm text-gray-500">{progress || 0}%</span>
        <Button variant="secondary" size="sm" disabled>
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Scanning...
        </Button>
      </div>
    )
  }

  return (
    <Button variant="primary" size="sm" onClick={onScan}>
      <RefreshCw className="w-4 h-4 mr-2" />
      New Scan
    </Button>
  )
}
