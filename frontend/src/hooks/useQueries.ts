import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DashboardSummary, ImageHealth, Vulnerability, ContainerAudit, DockerfileAnalysis } from '../types'

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: api.dashboard.summary,
  })
}

export function useImages() {
  return useQuery<ImageHealth[]>({
    queryKey: ['images'],
    queryFn: api.images.list,
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
