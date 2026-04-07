import { useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import { useHardening, useDockerfileAnalysis } from '../hooks/useQueries'
import type { DockerfileIssue } from '../types'
import { Shield, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

// Mock data
const mockContainers = [
  {
    container_name: 'nginx-proxy',
    checks: [
      { check_id: 'CS001', name: 'Privileged Mode', passed: true, severity: 'CRITICAL', details: 'Container is not privileged', recommendation: '' },
      { check_id: 'CS002', name: 'Root User', passed: false, severity: 'HIGH', details: 'Running as root', recommendation: 'Use non-root user' },
      { check_id: 'CS003', name: 'Read-Only RootFS', passed: false, severity: 'MEDIUM', details: 'Root filesystem is writable', recommendation: 'Use --read-only' },
      { check_id: 'CS004', name: 'Capabilities', passed: true, severity: 'HIGH', details: 'Capabilities dropped', recommendation: '' },
      { check_id: 'CS005', name: 'Resource Limits', passed: false, severity: 'MEDIUM', details: 'No CPU limits', recommendation: 'Set --cpus' },
      { check_id: 'CS006', name: 'Network Mode', passed: true, severity: 'MEDIUM', details: 'Bridge mode', recommendation: '' },
      { check_id: 'CS007', name: 'Restart Policy', passed: true, severity: 'LOW', details: 'unless-stopped', recommendation: '' },
      { check_id: 'CS008', name: 'Health Check', passed: false, severity: 'LOW', details: 'No health check', recommendation: 'Add HEALTHCHECK' },
    ].map((c) => ({ ...c, description: c.details, recommendation: c.recommendation })),
  },
  {
    container_name: 'redis-cache',
    checks: [
      { check_id: 'CS001', name: 'Privileged Mode', passed: true, severity: 'CRITICAL', details: 'Not privileged', recommendation: '' },
      { check_id: 'CS002', name: 'Root User', passed: true, severity: 'HIGH', details: 'Running as redis user', recommendation: '' },
      { check_id: 'CS003', name: 'Read-Only RootFS', passed: true, severity: 'MEDIUM', details: 'Read-only', recommendation: '' },
      { check_id: 'CS004', name: 'Capabilities', passed: true, severity: 'HIGH', details: 'All dropped', recommendation: '' },
      { check_id: 'CS005', name: 'Resource Limits', passed: true, severity: 'MEDIUM', details: '512MB memory limit', recommendation: '' },
      { check_id: 'CS006', name: 'Network Mode', passed: true, severity: 'MEDIUM', details: 'Bridge mode', recommendation: '' },
      { check_id: 'CS007', name: 'Restart Policy', passed: true, severity: 'LOW', details: 'always', recommendation: '' },
      { check_id: 'CS008', name: 'Health Check', passed: true, severity: 'LOW', details: 'Configured', recommendation: '' },
    ].map((c) => ({ ...c, description: c.details, recommendation: c.recommendation })),
  },
]

const mockDockerfiles = [
  {
    file: './Dockerfile',
    score: 'B',
    issues: [
      { line_number: 1, severity: 'MEDIUM', rule: 'DF004', message: 'Uses implicit :latest tag', recommendation: 'Pin version' },
      { line_number: 5, severity: 'HIGH', rule: 'DF001', message: 'Runs as root', recommendation: 'Add USER' },
      { line_number: 3, severity: 'LOW', rule: 'DF007', message: 'No HEALTHCHECK', recommendation: 'Add healthcheck' },
    ].map((i) => ({ ...i }) as DockerfileIssue),
  },
  {
    file: './Dockerfile.prod',
    score: 'A',
    issues: [],
  },
]

export default function HardeningPage() {
  const { data } = useHardening()
  const { data: dockerfiles } = useDockerfileAnalysis()
  const [activeTab, setActiveTab] = useState<'containers' | 'dockerfile'>('containers')

  const containers = data || mockContainers
  const dfAnalysis = dockerfiles || mockDockerfiles

  const totalPassed = containers.reduce((sum, c) => sum + c.checks.filter((x) => x.passed).length, 0)
  const totalChecks = containers.reduce((sum, c) => sum + c.checks.length, 0)
  const compliance = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0

  return (
    <>
      <TopBar title="Security Hardening">
        <Button variant="primary" size="sm">
          <Shield className="w-4 h-4 mr-2" />
          Run Audit
        </Button>
      </TopBar>

      <div className="p-6 space-y-6">
        {/* Compliance Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">CIS Docker Benchmark v1.6.0</p>
                <p className="text-4xl font-bold text-gray-900">{compliance}%</p>
                <p className="text-sm text-gray-500">Overall Compliance</p>
              </div>
              <div className="flex-1">
                <Progress value={compliance} className="h-4" />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-500">{totalPassed}/{totalChecks} checks passed</span>
                  <span className="text-sm text-gray-500">{totalChecks - totalPassed} failures</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'containers' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('containers')}
          >
            <Shield className="w-4 h-4 mr-2" />
            Container Security
          </Button>
          <Button
            variant={activeTab === 'dockerfile' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('dockerfile')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Dockerfile Analysis
          </Button>
        </div>

        {/* Container Checks */}
        {activeTab === 'containers' && (
          <div className="space-y-4">
            {containers.map((container) => {
              const passed = container.checks.filter((c) => c.passed).length
              const score = Math.round((passed / container.checks.length) * 100)

              return (
                <Card key={container.container_name}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{container.container_name}</CardTitle>
                      <span className={`text-lg font-bold ${score >= 80 ? 'text-risk-safe' : score >= 50 ? 'text-risk-warning' : 'text-risk-danger'}`}>
                        {passed}/{container.checks.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Check</th>
                          <th className="px-6 py-3">Severity</th>
                          <th className="px-6 py-3">Details</th>
                          <th className="px-6 py-3">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {container.checks.map((check) => (
                          <tr key={check.check_id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                            <td className="px-6 py-3">
                              {check.passed ? (
                                <CheckCircle className="w-5 h-5 text-risk-safe" />
                              ) : check.severity === 'CRITICAL' || check.severity === 'HIGH' ? (
                                <XCircle className="w-5 h-5 text-critical" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-medium" />
                              )}
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">{check.name}</td>
                            <td className="px-6 py-3">
                              <Badge severity={check.severity}>{check.severity}</Badge>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">{check.details}</td>
                            <td className="px-6 py-3 text-sm text-gray-500">{check.recommendation || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Dockerfile Analysis */}
        {activeTab === 'dockerfile' && (
          <div className="space-y-4">
            {dfAnalysis.map((df) => (
              <Card key={df.file}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono">{df.file}</CardTitle>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${
                        df.score === 'A' ? 'text-risk-safe' : df.score === 'B' ? 'text-risk-warning' : 'text-critical'
                      }`}>
                        Grade {df.score}
                      </span>
                      <Badge severity={df.issues.length > 3 ? 'HIGH' : df.issues.length > 0 ? 'MEDIUM' : 'INFO'}>
                        {df.issues.length} issues
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {df.issues.length > 0 ? (
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                          <th className="px-6 py-3">Line</th>
                          <th className="px-6 py-3">Severity</th>
                          <th className="px-6 py-3">Rule</th>
                          <th className="px-6 py-3">Issue</th>
                          <th className="px-6 py-3">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {df.issues.map((issue, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm font-mono text-gray-600">{issue.line_number}</td>
                            <td className="px-6 py-3"><Badge severity={issue.severity}>{issue.severity}</Badge></td>
                            <td className="px-6 py-3 text-sm font-mono text-gray-500">{issue.rule}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{issue.message}</td>
                            <td className="px-6 py-3 text-sm text-gray-500">{issue.recommendation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                ) : (
                  <CardContent>
                    <div className="flex items-center gap-3 text-risk-safe py-4">
                      <CheckCircle className="w-6 h-6" />
                      <span className="font-medium">No security issues found!</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
