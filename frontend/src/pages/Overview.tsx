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
import { useQueryClient } from '@tanstack/react-query'
import { formatDate, getRiskColor } from '../lib/utils'
import { Container, ShieldAlert, Activity } from 'lucide-react'
import { useState } from 'react'

// Mock data for demonstration (remove when API is ready)
// All numbers are consistent: KPI totals = sum of individual image counts
// Status is derived from risk_score (not random)
const mockImagesRaw = [
  { name: 'nginx', tag: 'latest', last_scan: new Date(Date.now() - 2 * 3600000).toISOString(), risk_score: 54, total_vulns: 45, critical: 0, high: 2, medium: 18, low: 25 },
  { name: 'python', tag: '3.11-slim', last_scan: new Date(Date.now() - 48 * 3600000).toISOString(), risk_score: 32, total_vulns: 38, critical: 0, high: 1, medium: 15, low: 22 },
  { name: 'node', tag: '20-alpine', last_scan: new Date(Date.now() - 48 * 3600000).toISOString(), risk_score: 71, total_vulns: 52, critical: 1, high: 3, medium: 20, low: 28 },
  { name: 'redis', tag: '7-alpine', last_scan: new Date(Date.now() - 5 * 3600000).toISOString(), risk_score: 18, total_vulns: 22, critical: 0, high: 0, medium: 8, low: 14 },
  { name: 'postgres', tag: '16-alpine', last_scan: new Date(Date.now() - 24 * 3600000).toISOString(), risk_score: 45, total_vulns: 35, critical: 0, high: 2, medium: 12, low: 21 },
  { name: 'alpine', tag: '3.19', last_scan: new Date(Date.now() - 48 * 3600000).toISOString(), risk_score: 8, total_vulns: 12, critical: 0, high: 0, medium: 4, low: 8 },
  { name: 'ubuntu', tag: '22.04', last_scan: new Date(Date.now() - 10 * 3600000).toISOString(), risk_score: 62, total_vulns: 71, critical: 1, high: 4, medium: 28, low: 38 },
]

// Derive status from most severe vulnerability, not just risk_score
const mockImages = mockImagesRaw.map(img => ({
  ...img,
  status: img.critical > 0 ? 'danger' as const : img.high > 2 || img.risk_score >= 70 ? 'danger' as const : img.risk_score >= 40 ? 'warning' as const : 'safe' as const,
}))

// KPI totals derived from individual images
const totalVulns = mockImages.reduce((s, i) => s + i.total_vulns, 0)
const totalCritical = mockImages.reduce((s, i) => s + i.critical, 0)
const totalHigh = mockImages.reduce((s, i) => s + i.high, 0)
const totalMedium = mockImages.reduce((s, i) => s + i.medium, 0)
const totalLow = mockImages.reduce((s, i) => s + i.low, 0)
const avgRisk = Math.round(mockImages.reduce((s, i) => s + i.risk_score, 0) / mockImages.length)

const mockSummary = {
  total_images: mockImages.length,
  total_vulns: totalVulns,
  critical: totalCritical,
  high: totalHigh,
  medium: totalMedium,
  low: totalLow,
  info: 0,
  risk_score: avgRisk,
  last_scan: mockImages[0].last_scan,
  trend: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
    critical: Math.floor(Math.random() * 3),
    high: Math.floor(Math.random() * 5) + 3,
    medium: Math.floor(Math.random() * 15) + 30,
    low: Math.floor(Math.random() * 15) + 40,
  })),
}

const mockPackages = [
  { package: 'openssl', count: 12 },
  { package: 'curl', count: 8 },
  { package: 'glibc', count: 6 },
  { package: 'libxml2', count: 4 },
  { package: 'zlib', count: 3 },
  { package: 'expat', count: 2 },
  { package: 'libpng', count: 1 },
]

export default function OverviewPage() {
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: images } = useImages()
  const queryClient = useQueryClient()
  const [showScanDialog, setShowScanDialog] = useState(false)
  const [scanning, setScanning] = useState(false)

  // Use real API data, fallback to mock only if API fails
  const s = summary || mockSummary
  const imgs = (images && images.length > 0) ? images : mockImages

  const handleScanComplete = () => {
    setScanning(false)
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['images'] })
  }

  return (
    <>
      <TopBar title="Overview">
        <ScanButton onScan={() => setShowScanDialog(true)} scanning={scanning} />
      </TopBar>

      <ScanDialog
        open={showScanDialog}
        onClose={() => setShowScanDialog(false)}
        onScanComplete={handleScanComplete}
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            icon={ShieldAlert}
            label="Total Vulnerabilities"
            value={isLoading ? undefined : s.total_vulns}
            color="text-gray-900"
          />
          <KPICard
            icon={ShieldAlert}
            label="Critical"
            value={isLoading ? undefined : s.critical}
            color="text-critical"
          />
          <KPICard
            icon={ShieldAlert}
            label="High"
            value={isLoading ? undefined : s.high}
            color="text-high"
          />
          <KPICard
            icon={Container}
            label="Images Scanned"
            value={isLoading ? undefined : s.total_images}
            color="text-gray-900"
          />
          <KPICard
            icon={Activity}
            label="Risk Score"
            value={isLoading ? undefined : s.risk_score}
            color={getRiskColor(s.risk_score)}
            suffix="/100"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Gauge */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {isLoading ? (
                <Skeleton className="w-48 h-48 rounded-full" />
              ) : (
                <>
                  <RiskGauge score={s.risk_score} size="lg" />
                  <StatusBadge score={s.risk_score} size="md" />
                  {s.last_scan && (
                    <p className="text-sm text-gray-500 mt-3">Last scan: {formatDate(s.last_scan)}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="w-full h-48" />
              ) : (
                <SeverityDonut
                  critical={s.critical}
                  high={s.high}
                  medium={s.medium}
                  low={s.low}
                  info={s.total_vulns - s.critical - s.high - s.medium - s.low}
                />
              )}
            </CardContent>
          </Card>

          {/* Top Vulnerable Packages */}
          <Card>
            <CardHeader>
              <CardTitle>Top Vulnerable Packages</CardTitle>
            </CardHeader>
            <CardContent>
              <TopPackages data={mockPackages} />
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>30-Day Vulnerability Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLine data={s.trend} />
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                {imgs.slice(0, 8).map((img, i) => (
                  <tr key={i} className="hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono text-gray-900">{img.name}:{img.tag}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {img.last_scan ? formatDate(img.last_scan) : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      {img.total_vulns}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {img.critical > 0 ? (
                        <Badge severity="CRITICAL">{img.critical}</Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {img.high > 0 ? (
                        <Badge severity="HIGH">{img.high}</Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">0</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-right font-semibold ${getRiskColor(img.risk_score)}`}>
                      {img.risk_score}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge score={img.risk_score} />
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

function KPICard({
  icon: Icon,
  label,
  value,
  color,
  suffix,
}: {
  icon: any
  label: string
  value: number | undefined
  color: string
  suffix?: string
}) {
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

