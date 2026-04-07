import type { Vulnerability } from '../../types'
import { Badge } from '../ui/badge'
import { X } from 'lucide-react'
import { Button } from '../ui/button'

interface VulnDetailDialogProps {
  vuln: Vulnerability | null
  onClose: () => void
}

export function VulnDetailDialog({ vuln, onClose }: VulnDetailDialogProps) {
  if (!vuln) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Badge severity={vuln.severity}>{vuln.severity}</Badge>
            <code className="text-lg font-mono font-semibold text-gray-900">{vuln.cve_id}</code>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {vuln.title && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
              <p className="text-gray-900">{vuln.title}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Package</h4>
              <p className="text-gray-900 font-mono">{vuln.package_name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Installed Version</h4>
              <p className="text-gray-900 font-mono">{vuln.installed_version}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Fixed Version</h4>
              <p className={vuln.fixed_version ? 'text-risk-safe font-mono' : 'text-gray-400'}>
                {vuln.fixed_version || 'No fix available'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-1">CVSS Score</h4>
              <p className={`text-2xl font-bold ${
                (vuln.cvss_score || 0) >= 9 ? 'text-critical' : (vuln.cvss_score || 0) >= 7 ? 'text-high' : 'text-medium'
              }`}>
                {vuln.cvss_score?.toFixed(1) || 'N/A'}
              </p>
            </div>
          </div>

          {vuln.references.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">References</h4>
              <div className="space-y-1">
                {vuln.references.slice(0, 5).map((ref, i) => (
                  <a
                    key={i}
                    href={ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-sidebar-active hover:underline truncate"
                  >
                    {ref}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
