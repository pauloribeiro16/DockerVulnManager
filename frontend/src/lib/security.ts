import DOMPurify from 'dompurify'

/**
 * Sanitize string to prevent XSS
 */
export function sanitize(text: string | null | undefined): string {
  if (!text) return ''
  return DOMPurify.sanitize(String(text), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * Sanitize HTML (allows safe tags like bold, links)
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOWED_URI_REGEXP: /^https?:\/\//,
    ADD_ATTR: ['target'],
  })
}

/**
 * Sanitize URL - only allow http/https
 */
export function sanitizeURL(url: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ''
    }
    return parsed.toString()
  } catch {
    return ''
  }
}

/**
 * Escape special characters in strings used in HTML context
 */
export function escapeHTML(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * Validate and sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return sanitize(query).trim().slice(0, 200)
}

/**
 * Validate severity string
 */
export function isValidSeverity(severity: string): boolean {
  return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(severity.toUpperCase())
}

/**
 * Sanitize image name (alphanumeric, dash, underscore, dot, colon, slash)
 */
export function sanitizeImageName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_.:/]/g, '')
}

/**
 * Create a safe nonce for CSP
 */
export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}
