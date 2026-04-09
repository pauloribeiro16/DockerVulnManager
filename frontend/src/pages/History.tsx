import { useMemo } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { TrendLine } from '../components/charts/TrendLine'
import { EmptyState } from '../components/common/EmptyState'
import { useTrendData, useScans } from '../hooks/useQueries'
import { formatDate, getRiskColor } from '../lib/utils'
import { History as HistoryIcon, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'

export default function HistoryPage() {
  const { data: trendData, isLoading: trendLoading } = useTrendData()
  const { data: scans, isLoading: scansLoading } = useScans(1, 20)

  const trend = useMemo(() => {
    if (!trendData || trendData.length === 0) return 0
    const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2))
    const lastHalf = trendData.slice(-Math.floor(trendData.length / 2))
    const firstTotal = firstHalf.reduce((s, d) => s + d.critical + d.high + d.medium + d.low, 0)
    const lastTotal = lastHalf.reduce((s, d) => s + d.critical + d.high + d.medium + d.low, 0)
    return lastTotal - firstTotal
  }, [trendData])

  const isLoading = trendLoading || scansLoading

  if (isLoading) {
    return (
      <>
        <TopBar title="History" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sidebar-active" />
        </div>
      </>
    )
  }

  const trendPoints = trendData ?? []
  const scanList = scans ?? []

  const hasData = trendPoints.length > 0 || scanList.length > 0

  return (
    <>
      <TopBar title="History" />

      <div className="p-6 space-y-6">
        {!hasData ? (
          <EmptyState
            title="No scan history"
            description="Scanned images will appear here with trend data."
          />
        ) : (
          <>
            {/* Trend Stats */}
            {trendPoints.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">30-Day Trend</p>
                        <p className={`text-2xl font-bold flex items-center gap-2 ${trend > 0 ? 'text-critical' : 'text-risk-safe'}`}>
                          {trend > 0 ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                          {Math.abs(trend)}
                        </p>
                        <p className="text-sm text-gray-500">vulnerabilities vs previous period</p>
                      </div>
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <HistoryIcon className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-gray-500 mb-1">Total Scans</p>
                    <p className="text-2xl font-bold text-gray-900">{scanList.length}</p>
                    <p className="text-sm text-gray-500">in database</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-gray-500 mb-1">Data Points</p>
                    <p className="text-2xl font-bold text-gray-900">{trendPoints.length}</p>
                    <p className="text-sm text-gray-500">trend entries</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Trend Chart */}
            {trendPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Vulnerability Trend (30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendLine data={trendPoints} />
                </CardContent>
              </Card>
            )}

            {/* Scan History */}
            {scanList.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Scan History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                        <th className="px-6 py-3">Scan ID</th>
                        <th className="px-6 py-3">Image</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3 text-right">Total</th>
                        <th className="px-6 py-3 text-right">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanList.map((scan) => (
                        <tr key={scan.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm font-mono text-sidebar-active">#{scan.id}</td>
                          <td className="px-6 py-3 text-sm font-mono text-gray-900">
                            {scan.image_name}:{scan.image_tag}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">{formatDate(scan.scan_timestamp)}</td>
                          <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{scan.total_count}</td>
                          <td className={`px-6 py-3 text-right text-sm font-semibold ${
                            scan.risk_score >= 70 ? 'text-critical' : scan.risk_score >= 40 ? 'text-medium' : 'text-risk-safe'
                          }`}>
                            {scan.risk_score.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  )
}
