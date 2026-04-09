import { useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { SeverityDonut } from '../components/charts/SeverityDonut'
import { RiskGauge } from '../components/charts/RiskGauge'
import { TrendLine } from '../components/charts/TrendLine'
import { TopPackages } from '../components/charts/TopPackages'
import { StatusBadge } from '../components/common/StatusBadge'
import { ScanButton } from '../components/common/ScanButton'
import { ScanDialog } from '../components/common/ScanDialog'
import { useDashboardSummary, useImages } from '../hooks/useQueries'
import { formatDate, getRiskColor } from '../lib/utils'
import { Container, ShieldAlert, Activity } from 'lucide-react'

// Empty state mock data
const emptySummary = {
  total_images: 0, total_vulns: 0, critical: 0, high: 0,
  medium: 0, low: 0, info: 0, risk_score: 0, last_scan: null, trend: [],
}

export default function OverviewPage() {
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: images } = useImages()
  const [showScanDialog, setShowScanDialog] = useState(false)

  // Use real API data - fallback to empty state only if no data
  const s = summary || emptySummary
  const imgs = images || []

  return (
    <>
      <TopBar title="Overview">
        <ScanButton onScan={() => setShowScanDialog(true)} scanning={false} />
      </TopBar>

      <ScanDialog open={showScanDialog} onClose={() => setShowScanDialog(false)} onScanComplete={() => {}} />

      {/* Data Source Indicator */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm ${
          summary ? 'bg-green-100/90 text-green-800 border border-green-300' : 'bg-yellow-100/90 text-yellow-800 border border-yellow-300'
        }`}>
          {summary ? '🟢 Live API Data' : '🟡 No API Data'}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard icon={ShieldAlert} label="Total Vulnerabilities" value={isLoading ? undefined : s.total_vulns} color="text-gray-900" />
          <KPICard icon={ShieldAlert} label="Critical" value={isLoading ? undefined : s.critical} color="text-critical" />
          <KPICard icon={ShieldAlert} label="High" value={isLoading ? undefined : s.high} color="text-high" />
          <KPICard icon={Container} label="Images Scanned" value={isLoading ? undefined : s.total_images} color="text-gray-900" />
          <KPICard icon={Activity} label="Risk Score" value={isLoading ? undefined : s.risk_score} color={getRiskColor(s.risk_score)} suffix="/100" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle>Risk Assessment</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              {isLoading ? <Skeleton className="w-48 h-48 rounded-full" /> : (
                <>
                  <RiskGauge score={s.risk_score} size="lg" />
                  <StatusBadge score={s.risk_score} size="md" />
                  {s.last_scan && <p className="text-sm text-gray-500 mt-3">Last scan: {formatDate(s.last_scan)}</p>}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Severity Distribution</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="w-full h-48" /> : (
                <SeverityDonut critical={s.critical} high={s.high} medium={s.medium} low={s.low} info={0} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top Vulnerable Packages</CardTitle></CardHeader>
            <CardContent>
              <TopPackages data={[]} />
              {imgs.length === 0 && <p className="text-center text-gray-500 text-sm mt-4">Scan an image to see data</p>}
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader><CardTitle>30-Day Vulnerability Trend</CardTitle></CardHeader>
          <CardContent><TrendLine data={s.trend || []} /></CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader><CardTitle>Recent Scans</CardTitle></CardHeader>
          <CardContent className="p-0">
            {imgs.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <p className="text-lg font-medium mb-2">No scans yet</p>
                <p className="text-sm">Click "New Scan" to scan your first Docker image</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Image</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-right">Critical</th>
                    <th className="px-6 py-3 text-right">High</th>
                    <th className="px-6 py-3 text-right">Risk</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {imgs.slice(0, 8).map((img: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <td className="px-6 py-4"><code className="text-sm font-mono text-gray-900">{img.name}:{img.tag}</code></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{img.last_scan ? formatDate(img.last_scan) : 'Never'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">{img.total_vulns || 0}</td>
                      <td className="px-6 py-4 text-right">
                        {(img.critical || 0) > 0 ? <Badge severity="CRITICAL">{img.critical}</Badge> : <span className="text-gray-400 text-sm">0</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(img.high || 0) > 0 ? <Badge severity="HIGH">{img.high}</Badge> : <span className="text-gray-400 text-sm">0</span>}
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${getRiskColor(img.risk_score || 0)}`}>{img.risk_score || 0}</td>
                      <td className="px-6 py-4"><StatusBadge score={img.risk_score || 0} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function KPICard({ icon: Icon, label, value, color, suffix }: { icon: any; label: string; value: number | undefined; color: string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>
              {value !== undefined ? value : <Skeleton className="w-16 h-8" />}
              {suffix && <span className="text-lg font-normal text-gray-500 ml-1">{suffix}</span>}
            </p>
          </div>
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
