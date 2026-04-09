import { useParams, useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { VulnRow } from '../components/vulns/VulnRow'
import { VulnDetailDialog } from '../components/vulns/VulnDetailDialog'
import { StatusBadge } from '../components/common/StatusBadge'
import { EmptyState } from '../components/common/EmptyState'
import { formatDate, getRiskColor } from '../lib/utils'
import { sanitizeImageName } from '../lib/security'
import { useImageHistory } from '../hooks/useQueries'
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { Vulnerability } from '../types'

export default function ImageDetailPage() {
  const params = useParams<{ name: string; tag: string }>()
  const navigate = useNavigate()
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null)

  const rawName = params.name || ''
  const rawTag = params.tag || ''
  const name = sanitizeImageName(decodeURIComponent(rawName))
  const tag = sanitizeImageName(decodeURIComponent(rawTag))

  const { data: history, isLoading } = useImageHistory(name, tag)

  // Get most recent scan and flatten its vulnerabilities
  const latestScan = history?.[0]
  const vulns = latestScan?.vulnerabilities ?? []
  const riskScore = latestScan?.risk_score ?? 0

  if (isLoading) {
    return (
      <>
        <TopBar title={`${name}:${tag}`}>
          <Button variant="secondary" size="sm" onClick={() => navigate('/images')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Images
          </Button>
        </TopBar>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sidebar-active" />
        </div>
      </>
    )
  }

  const hasData = vulns.length > 0

  return (
    <>
      <TopBar title={`${name}:${tag}`}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/images')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Images
        </Button>
      </TopBar>

      <div className="p-6 space-y-6">
        {/* Image Summary */}
        {hasData && latestScan && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Risk Score</p>
                    <p className={`text-3xl font-bold ${getRiskColor(riskScore)}`}>
                      {riskScore.toFixed(1)}<span className="text-lg text-gray-400">/100</span>
                    </p>
                  </div>
                  <StatusBadge score={riskScore} size="md" />
                  <div className="flex items-center gap-2">
                    {latestScan.critical_count > 0 && <Badge severity="CRITICAL">🔴 {latestScan.critical_count}</Badge>}
                    {latestScan.high_count > 0 && <Badge severity="HIGH">🟠 {latestScan.high_count}</Badge>}
                    {latestScan.medium_count > 0 && <Badge severity="MEDIUM">🟡 {latestScan.medium_count}</Badge>}
                    {latestScan.low_count > 0 && <Badge severity="LOW">🔵 {latestScan.low_count}</Badge>}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>{vulns.length} total vulnerabilities</p>
                  <p>Scanned {formatDate(latestScan.scan_timestamp)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vulnerabilities Table */}
        {!hasData ? (
          <EmptyState
            title="No scan data"
            description={`No vulnerability data found for ${name}:${tag}. Run a scan first.`}
          />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vulnerabilities</CardTitle>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-3">CVE ID</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Package</th>
                    <th className="px-4 py-3">Installed</th>
                    <th className="px-4 py-3">Fixed</th>
                    <th className="px-4 py-3 text-right">CVSS</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {vulns.map((vuln) => (
                    <VulnRow key={vuln.cve_id} vuln={vuln} onClick={() => setSelectedVuln(vuln)} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <VulnDetailDialog vuln={selectedVuln} onClose={() => setSelectedVuln(null)} />
    </>
  )
}
