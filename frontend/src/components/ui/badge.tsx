import { cn } from '../../lib/utils'
import { getSeverityBg } from '../../lib/utils'

export function Badge({ severity, children }: { severity: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', getSeverityBg(severity))}>
      {children}
    </span>
  )
}
