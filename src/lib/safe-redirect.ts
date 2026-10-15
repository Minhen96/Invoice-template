/**
 * Only allow in-app paths as post-login redirects (prevents open redirects such as
 * `?redirect=//evil.example` or `?redirect=https://evil.example`).
 */
export function safeRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}
