import { Badge } from '../ui/badge'
import { ExternalLink } from 'lucide-react'
import type { Vulnerability } from '../../types'

interface VulnRowProps {
  vuln: Vulnerability
  onClick: (e?: React.MouseEvent) => void
}

export function VulnRow({ vuln, onClick }: VulnRowProps) {
  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <code className="text-sm font-mono text-sidebar-active">{vuln.cve_id}</code>
      </td>
      <td className="px-4 py-3">
        <Badge severity={vuln.severity}>{vuln.severity}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{vuln.package_name}</td>
      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{vuln.installed_version}</td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {vuln.fixed_version ? (
          <span className="text-risk-safe font-mono">{vuln.fixed_version}</span>
        ) : (
          <span className="text-gray-400">N/A</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {vuln.cvss_score ? (
          <span className={`font-semibold ${vuln.cvss_score >= 9 ? 'text-critical' : vuln.cvss_score >= 7 ? 'text-high' : 'text-medium'}`}>
            {vuln.cvss_score}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onClick() }}
        >
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </button>
      </td>
    </tr>
  )
}
