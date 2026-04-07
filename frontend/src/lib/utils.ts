import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export function getRiskColor(score: number): string {
  if (score >= 70) return 'text-risk-danger'
  if (score >= 40) return 'text-risk-warning'
  return 'text-risk-safe'
}

export function getRiskBgColor(score: number): string {
  if (score >= 70) return 'bg-risk-danger'
  if (score >= 40) return 'bg-risk-warning'
  return 'bg-risk-safe'
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'text-critical',
    HIGH: 'text-high',
    MEDIUM: 'text-medium',
    LOW: 'text-low',
    INFO: 'text-info',
  }
  return colors[severity] || 'text-info'
}

export function getSeverityBg(severity: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-critical text-white',
    HIGH: 'bg-high text-white',
    MEDIUM: 'bg-medium text-gray-900',
    LOW: 'bg-low text-white',
    INFO: 'bg-info text-white',
  }
  return colors[severity] || 'bg-info text-white'
}
