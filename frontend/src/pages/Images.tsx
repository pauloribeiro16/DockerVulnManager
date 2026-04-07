import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { StatusBadge } from '../components/common/StatusBadge'
import { ScanButton } from '../components/common/ScanButton'
import { useImages } from '../hooks/useQueries'
import { formatDate, getRiskColor } from '../lib/utils'
import { Eye, RefreshCw } from 'lucide-react'

// Mock data
const mockImages = Array.from({ length: 14 }, (_, i) => ({
  name: ['nginx', 'python', 'node', 'redis', 'postgres', 'alpine', 'ubuntu', 'golang', 'rust', 'ruby', 'php', 'java', 'dotnet', 'perl'][i],
  tag: ['latest', '3.11-slim', '20-alpine', '7-alpine', '16-alpine', '3.19', '22.04', '1.21', '1.75', '3.3', '8.3', '21', '8.0', '5.38'][i],
  last_scan: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
  risk_score: Math.floor(Math.random() * 100),
  total_vulns: Math.floor(Math.random() * 300) + 10,
  critical: Math.floor(Math.random() * 5),
  high: Math.floor(Math.random() * 15),
  medium: Math.floor(Math.random() * 50),
  low: Math.floor(Math.random() * 100),
  status: ['safe', 'warning', 'danger'][Math.floor(Math.random() * 3)] as 'safe' | 'warning' | 'danger',
}))

export default function ImagesPage() {
  const { data } = useImages()
  const images = data || mockImages

  return (
    <>
      <TopBar title="Docker Images">
        <ScanButton onScan={() => {}} scanning={false} />
      </TopBar>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {images.map((img, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <code className="text-base font-mono font-semibold text-gray-900">
                      {img.name}
                    </code>
                    <span className="text-sm text-gray-500 ml-1">:{img.tag}</span>
                  </div>
                  <StatusBadge score={img.risk_score} />
                </div>

                {/* Risk Score */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-2xl font-bold ${getRiskColor(img.risk_score)}`}>
                    {img.risk_score}
                  </span>
                  <span className="text-sm text-gray-500">risk score</span>
                </div>

                {/* Vuln counts */}
                <div className="flex items-center gap-2 mb-4">
                  {img.critical > 0 && <Badge severity="CRITICAL">🔴 {img.critical}</Badge>}
                  {img.high > 0 && <Badge severity="HIGH">🟠 {img.high}</Badge>}
                  {img.medium > 0 && <Badge severity="MEDIUM">🟡 {img.medium}</Badge>}
                  {img.low > 0 && <Badge severity="LOW">🔵 {img.low}</Badge>}
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Total: {img.total_vulns} vulnerabilities
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {img.last_scan ? `Scanned ${formatDate(img.last_scan)}` : 'Never scanned'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
