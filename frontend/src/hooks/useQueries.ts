import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DashboardSummary, ImageHealth, Vulnerability, ContainerAudit, DockerfileAnalysis, ScanResult, TrendPoint } from '../types'

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: api.dashboard.summary,
  })
}

export function useTrendData() {
  return useQuery<TrendPoint[]>({
    queryKey: ['dashboard', 'trend'],
    queryFn: api.dashboard.trend,
  })
}

export function useScans(page = 1, size = 20) {
  return useQuery({
    queryKey: ['scans', page, size],
    queryFn: () => api.scans.list(page, size),
  })
}

export function useImages() {
  return useQuery<ImageHealth[]>({
    queryKey: ['images'],
    queryFn: api.images.list,
  })
}

export function useImageHistory(name: string, tag: string) {
  return useQuery<ScanResult[]>({
    queryKey: ['images', name, tag, 'history'],
    queryFn: () => api.images.history(name, tag),
    enabled: !!name && !!tag,
  })
}

export function useVulnerabilities(filters?: Record<string, string>) {
  return useQuery<Vulnerability[]>({
    queryKey: ['vulnerabilities', filters],
    queryFn: () => api.vulnerabilities.list(filters),
  })
}

export function useHardening() {
  return useQuery<ContainerAudit[]>({
    queryKey: ['hardening'],
    queryFn: api.hardening.containers,
  })
}

export function useDockerfileAnalysis() {
  return useQuery<DockerfileAnalysis[]>({
    queryKey: ['hardening', 'dockerfile'],
    queryFn: api.hardening.dockerfile,
  })
}
