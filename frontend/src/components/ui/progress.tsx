import { cn } from '../../lib/utils'

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('w-full bg-gray-200 rounded-full h-2.5', className)}>
      <div
        className="h-2.5 rounded-full bg-sidebar-active transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
