const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  dashboard: {
    summary: () => request<import('../types').DashboardSummary>('/api/v1/dashboard/summary'),
    trend: () => request<import('../types').TrendPoint[]>('/api/v1/dashboard/trend'),
  },
  scans: {
    list: (page = 1, size = 20) => request(`/api/v1/scans?page=${page}&size=${size}`),
    get: (id: number) => request<import('../types').ScanResult>(`/api/v1/scans/${id}`),
    create: (image: string) => request<{ scan_id: string }>('/api/v1/scans', {
      method: 'POST',
      body: JSON.stringify({ image }),
    }),
  },
  vulnerabilities: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString()
      return request<import('../types').Vulnerability[]>(`/api/v1/vulnerabilities?${qs}`)
    },
    get: (cveId: string) => request<import('../types').Vulnerability>(`/api/v1/vulnerabilities/${cveId}`),
  },
  images: {
    list: () => request<import('../types').ImageHealth[]>('/api/v1/images'),
    history: (name: string, tag: string) =>
      request<import('../types').ScanResult[]>(`/api/v1/images/${encodeURIComponent(name)}/${encodeURIComponent(tag)}/history`),
    scan: (name: string, tag: string) =>
      request<{ scan_id: string }>(`/api/v1/images/${encodeURIComponent(name)}/${encodeURIComponent(tag)}/scan`, { method: 'POST' }),
  },
  hardening: {
    containers: () => request<import('../types').ContainerAudit[]>('/api/v1/hardening'),
    dockerfile: () => request<import('../types').DockerfileAnalysis[]>('/api/v1/hardening/dockerfile'),
  },
}

export function createScanProgressWs(scanId: string): WebSocket {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return new WebSocket(`${proto}//${host}/ws/scan-progress/${scanId}`)
}
