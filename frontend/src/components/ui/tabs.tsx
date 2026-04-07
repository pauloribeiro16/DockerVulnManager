import { cn } from '../../lib/utils'

export function Tabs({
  value,
  onValueChange,
  tabs,
}: {
  value: string
  onValueChange: (v: string) => void
  tabs: { value: string; label: string }[]
}) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onValueChange(tab.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            value === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
