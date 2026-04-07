import { cn } from '../../lib/utils'

interface StatusBadgeProps {
  score: number
  size?: 'sm' | 'md'
}

export function StatusBadge({ score, size = 'sm' }: StatusBadgeProps) {
  const label = score >= 70 ? 'Danger' : score >= 40 ? 'Warning' : 'Safe'
  const colors = {
    Danger: 'bg-critical text-white',
    Warning: 'bg-medium text-gray-900',
    Safe: 'bg-risk-safe text-white',
  }
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span className={cn('inline-flex items-center font-medium rounded-full', colors[label], sizes[size])}>
      {label}
    </span>
  )
}
