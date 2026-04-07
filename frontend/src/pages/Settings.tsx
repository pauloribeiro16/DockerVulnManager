import { TopBar } from '../components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Settings, Database, Shield, RefreshCw, Trash2 } from 'lucide-react'

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Settings" />

      <div className="p-6 space-y-6">
        {/* Scanner Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Scanner Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trivy Path</label>
                <input
                  type="text"
                  defaultValue="trivy"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-active"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scan Timeout (seconds)</label>
                <input
                  type="number"
                  defaultValue="300"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-active"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-gray-700">Enable caching</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cache TTL (seconds)</label>
                <input
                  type="number"
                  defaultValue="3600"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-mono text-gray-700">~/.dockervuln/vulns.db</p>
              <p className="text-sm text-gray-500 mt-1">SQLite database</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Backup Database
              </Button>
              <Button variant="danger" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Scan History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Checks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'CIS Docker Benchmark v1.6.0', enabled: true },
              { label: 'Check for root users', enabled: true },
              { label: 'Check for privileged containers', enabled: true },
              { label: 'Validate resource limits', enabled: true },
              { label: 'Check network mode security', enabled: true },
            ].map((item) => (
              <label key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <span className="text-sm text-gray-700">{item.label}</span>
                <input type="checkbox" defaultChecked={item.enabled} className="w-4 h-4 rounded" />
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button variant="primary" size="lg">
            <Settings className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </>
  )
}
