import { Bell, Search } from 'lucide-react'
import { Button } from '../ui/button'

export function TopBar({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {children}
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-2 w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-active focus:border-transparent"
            />
          </div>
          {/* Notifications */}
          <Button variant="ghost" size="sm">
            <Bell className="w-5 h-5 text-gray-600" />
          </Button>
        </div>
      </div>
    </header>
  )
}
