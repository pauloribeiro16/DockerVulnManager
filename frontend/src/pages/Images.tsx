import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { StatusBadge } from '../components/common/StatusBadge'
import { ScanButton } from '../components/common/ScanButton'
import { EmptyState } from '../components/common/EmptyState'
import { useImages } from '../hooks/useQueries'
import { formatDate, getRiskColor } from '../lib/utils'
import { sanitizeImageName } from '../lib/security'
import { Eye, RefreshCw, Loader2 } from 'lucide-react'

export default function ImagesPage() {
  const { data, isLoading } = useImages()
  const navigate = useNavigate()
  const [scanningImage, setScanningImage] = useState<string | null>(null)

  const handleView = (name: string, tag: string) => {
    const safeName = sanitizeImageName(name)
    const safeTag = sanitizeImageName(tag)
    navigate(`/images/${encodeURIComponent(safeName)}/${encodeURIComponent(safeTag)}`)
  }

  const handleRefresh = async (name: string, tag: string) => {
    const safeName = sanitizeImageName(name)
    const safeTag = sanitizeImageName(tag)
    const key = `${safeName}:${safeTag}`
    setScanningImage(key)
    // TODO: Call API to trigger scan
    setTimeout(() => setScanningImage(null), 2000)
  }

  if (isLoading) {
    return (
      <>
        <TopBar title="Docker Images">
          <ScanButton onScan={() => {}} scanning={false} />
        </TopBar>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sidebar-active" />
        </div>
      </>
    )
  }

  const images = data || []

  return (
    <>
      <TopBar title="Docker Images">
        <ScanButton onScan={() => {}} scanning={false} />
      </TopBar>

      <div className="p-6">
        {images.length === 0 ? (
          <EmptyState
            title="No images scanned yet"
            description="Scan your first Docker image to start tracking vulnerabilities."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {images.map((img) => {
              const isScanning = scanningImage === `${img.name}:${img.tag}`
              return (
                <Card key={`${img.name}:${img.tag}`} className="hover:shadow-md transition-shadow">
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
                        <Button variant="ghost" size="sm" onClick={() => handleView(img.name, img.tag)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isScanning}
                          onClick={() => handleRefresh(img.name, img.tag)}
                        >
                          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
