import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { TrendLine } from '../components/charts/TrendLine'
import { formatDate } from '../lib/utils'
import { History as HistoryIcon, ArrowUp, ArrowDown } from 'lucide-react'

// Mock data
const mockHistory = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  critical: Math.floor(Math.random() * 5),
  high: Math.floor(Math.random() * 15) + 3,
  medium: Math.floor(Math.random() * 30) + 40,
  low: Math.floor(Math.random() * 40) + 60,
}))

const mockScans = Array.from({ length: 20 }, (_, i) => ({
  id: 1000 + i,
  image: ['nginx', 'python', 'node', 'redis', 'postgres'][i % 5],
  tag: ['latest', '3.11-slim', '20-alpine', '7-alpine', '16-alpine'][i % 5],
  date: new Date(Date.now() - i * 3600000 * Math.random() * 10).toISOString(),
  total: Math.floor(Math.random() * 300) + 50,
  critical: Math.floor(Math.random() * 5),
  high: Math.floor(Math.random() * 15),
  risk: Math.floor(Math.random() * 100),
}))

export default function HistoryPage() {
  const firstWeek = mockHistory.slice(0, 7).reduce((s, d) => s + d.critical + d.high + d.medium + d.low, 0)
  const lastWeek = mockHistory.slice(-7).reduce((s, d) => s + d.critical + d.high + d.medium + d.low, 0)
  const trend = lastWeek - firstWeek

  return (
    <>
      <TopBar title="History" />

      <div className="p-6 space-y-6">
        {/* Trend Stats */}
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
                  <p className="text-sm text-gray-500">vulnerabilities vs 30d ago</p>
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
              <p className="text-2xl font-bold text-gray-900">{mockScans.length}</p>
              <p className="text-sm text-gray-500">in database</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-gray-500 mb-1">Images Tracked</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
              <p className="text-sm text-gray-500">unique images</p>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Vulnerability Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLine data={mockHistory} />
          </CardContent>
        </Card>

        {/* Scan History */}
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
                  <th className="px-6 py-3 text-right">Critical</th>
                  <th className="px-6 py-3 text-right">High</th>
                  <th className="px-6 py-3 text-right">Risk</th>
                </tr>
              </thead>
              <tbody>
                {mockScans.map((scan) => (
                  <tr key={scan.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-mono text-sidebar-active">#{scan.id}</td>
                    <td className="px-6 py-3 text-sm font-mono text-gray-900">
                      {scan.image}:{scan.tag}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{formatDate(scan.date)}</td>
                    <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{scan.total}</td>
                    <td className="px-6 py-3 text-right text-sm text-critical font-medium">{scan.critical}</td>
                    <td className="px-6 py-3 text-right text-sm text-high font-medium">{scan.high}</td>
                    <td className={`px-6 py-3 text-right text-sm font-semibold ${
                      scan.risk >= 70 ? 'text-critical' : scan.risk >= 40 ? 'text-medium' : 'text-risk-safe'
                    }`}>
                      {scan.risk}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
