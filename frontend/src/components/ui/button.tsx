import { cn } from '../../lib/utils'

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled,
}: {
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  const variants = {
    primary: 'bg-sidebar-active hover:bg-blue-600 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
    ghost: 'hover:bg-gray-100 text-gray-700',
    danger: 'bg-critical hover:bg-red-700 text-white',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
