export interface Vulnerability {
  cve_id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  package_name: string
  installed_version: string
  fixed_version: string | null
  title: string | null
  cvss_score: number | null
  references: string[]
}

export interface ScanResult {
  id: number
  image_name: string
  image_tag: string
  scan_timestamp: string
  scanner_version?: string
  packages_scanned: number
  risk_score: number
  vulnerabilities: Vulnerability[]
  total_count: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
}

export interface ImageHealth {
  name: string
  tag: string
  last_scan: string | null
  risk_score: number
  total_vulns: number
  critical: number
  high: number
  medium: number
  low: number
  status: 'safe' | 'warning' | 'danger'
}

export interface DashboardSummary {
  total_images: number
  total_vulns: number
  critical: number
  high: number
  medium: number
  low: number
  info: number
  risk_score: number
  last_scan: string | null
  trend: TrendPoint[]
}

export interface TrendPoint {
  date: string
  critical: number
  high: number
  medium: number
  low: number
}

export interface SecurityCheck {
  check_id: string
  name: string
  description: string
  passed: boolean
  severity: string
  details: string
  recommendation: string
}

export interface ContainerAudit {
  container_name: string
  checks: SecurityCheck[]
  passed: number
  total: number
  score: number
}

export interface DockerfileIssue {
  line_number: number
  severity: string
  rule: string
  message: string
  recommendation: string
}

export interface DockerfileAnalysis {
  file: string
  issues: DockerfileIssue[]
  score: string
}

export interface ScanProgress {
  scan_id: string
  progress: number
  status: string
  message: string
}

export interface ScanJobStatus {
  scan_id: string
  status: 'queued' | 'running' | 'complete' | 'failed'
  image: string | null
  total_images: number | null
  scanned_images: number
  message: string | null
  vulns_found: number
  created_at: string
  updated_at: string
}
