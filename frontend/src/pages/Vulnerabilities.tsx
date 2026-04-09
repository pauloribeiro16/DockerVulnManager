import { useState, useMemo } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { VulnRow } from '../components/vulns/VulnRow'
import { VulnDetailDialog } from '../components/vulns/VulnDetailDialog'
import { EmptyState } from '../components/common/EmptyState'
import { useVulnerabilities } from '../hooks/useQueries'
import { isValidSeverity } from '../lib/security'
import type { Vulnerability } from '../types'
import { Search, Filter, Loader2 } from 'lucide-react'

export default function VulnerabilitiesPage() {
  const { data, isLoading } = useVulnerabilities()
  const vulns = data ?? []
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const filtered = useMemo(() => {
    let result = vulns
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (v) =>
          v.cve_id.toLowerCase().includes(q) ||
          v.package_name.toLowerCase().includes(q) ||
          v.title?.toLowerCase().includes(q)
      )
    }
    if (severityFilter && isValidSeverity(severityFilter)) {
      result = result.filter((v) => v.severity === severityFilter)
    }
    return result
  }, [vulns, search, severityFilter])

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  return (
    <>
      <TopBar title="Vulnerabilities" />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search CVE, package, description..."
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-active focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <Button
                    key={sev}
                    variant={severityFilter === sev ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => {
                      setSeverityFilter(severityFilter === sev ? null : sev)
                      setPage(1)
                    }}
                  >
                    {sev}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-gray-500 mb-4">
              {filtered.length} vulnerabilities · Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </p>

            {filtered.length === 0 ? (
              <EmptyState title="No vulnerabilities found" description="All clear! Your images are safe." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            {Array.from({ length: 7 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      : paginated.map((vuln) => (
                          <VulnRow key={vuln.cve_id} vuln={vuln} onClick={() => setSelectedVuln(vuln)} />
                        ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <VulnDetailDialog vuln={selectedVuln} onClose={() => setSelectedVuln(null)} />
    </>
  )
}
