import { useParams, useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { VulnRow } from '../components/vulns/VulnRow'
import { VulnDetailDialog } from '../components/vulns/VulnDetailDialog'
import { StatusBadge } from '../components/common/StatusBadge'
import { formatDate, getRiskColor } from '../lib/utils'
import { sanitizeImageName } from '../lib/security'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { Vulnerability } from '../types'

// Mock vulnerabilities for the image detail view
const generateMockVulns = (name: string, _tag: string): Vulnerability[] => {
  const packages = ['openssl', 'curl', 'glibc', 'libxml2', 'zlib', 'expat', 'libpng', 'busybox']
  return Array.from({ length: 20 + Math.floor(Math.random() * 30) }, (_, i) => ({
    cve_id: `CVE-2024-${3000 + i}`,
    severity: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const)[i % 5],
    package_name: packages[i % packages.length],
    installed_version: `${1 + (i % 5)}.${i % 10}.${i % 20}`,
    fixed_version: i % 3 === 0 ? `${2 + (i % 5)}.${i % 10}.${i % 20}` : null,
    title: `Vulnerability in ${packages[i % packages.length]} for ${name}`,
    cvss_score: i % 5 === 0 ? 9.8 : i % 5 === 1 ? 7.5 : i % 5 === 2 ? 5.5 : i % 5 === 3 ? 3.2 : 1.0,
    references: [`https://nvd.nist.gov/vuln/detail/CVE-2024-${3000 + i}`],
  }))
}

export default function ImageDetailPage() {
  const params = useParams<{ name: string; tag: string }>()
  const navigate = useNavigate()
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null)

  const rawName = params.name || ''
  const rawTag = params.tag || ''
  const name = sanitizeImageName(decodeURIComponent(rawName))
  const tag = sanitizeImageName(decodeURIComponent(rawTag))

  const mockVulns = generateMockVulns(name, tag)
  const critical = mockVulns.filter(v => v.severity === 'CRITICAL').length
  const high = mockVulns.filter(v => v.severity === 'HIGH').length
  const medium = mockVulns.filter(v => v.severity === 'MEDIUM').length
  const low = mockVulns.filter(v => v.severity === 'LOW').length
  const riskScore = Math.round((critical * 10 + high * 7 + medium * 4 + low * 2) / Math.max(1, mockVulns.length) * 10)

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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-gray-500">Risk Score</p>
                  <p className={`text-3xl font-bold ${getRiskColor(riskScore)}`}>
                    {riskScore}<span className="text-lg text-gray-400">/100</span>
                  </p>
                </div>
                <StatusBadge score={riskScore} size="md" />
                <div className="flex items-center gap-2">
                  {critical > 0 && <Badge severity="CRITICAL">🔴 {critical}</Badge>}
                  {high > 0 && <Badge severity="HIGH">🟠 {high}</Badge>}
                  {medium > 0 && <Badge severity="MEDIUM">🟡 {medium}</Badge>}
                  {low > 0 && <Badge severity="LOW">🔵 {low}</Badge>}
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{mockVulns.length} total vulnerabilities</p>
                <p>Scanned {formatDate(new Date().toISOString())}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vulnerabilities Table */}
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
                {mockVulns.map((vuln) => (
                  <VulnRow key={vuln.cve_id} vuln={vuln} onClick={() => setSelectedVuln(vuln)} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <VulnDetailDialog vuln={selectedVuln} onClose={() => setSelectedVuln(null)} />
    </>
  )
}
