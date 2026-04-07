import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldAlert,
  Container,
  History,
  HardHat,
  Settings,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/' },
  { icon: ShieldAlert, label: 'Vulnerabilities', path: '/vulnerabilities' },
  { icon: Container, label: 'Images', path: '/images' },
  { icon: History, label: 'History', path: '/history' },
  { icon: HardHat, label: 'Hardening', path: '/hardening' },
  { icon: Settings, label: 'Settings', path: '/settings' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar-bg flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-active rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base">DockerVuln</h1>
            <p className="text-gray-400 text-xs">Security Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={
                isActive
                  ? 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-sidebar-active text-white'
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-text hover:bg-gray-700/50 hover:text-white'
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs">v0.1.0</p>
      </div>
    </aside>
  )
}
