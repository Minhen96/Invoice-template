/**
 * Email and password rules shared by the server (authoritative) and the sign-up form
 * (instant feedback), so both always agree.
 */

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trim + lower-case (dots and +tags kept). Returns null when it isn't a plausible address. */
export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !EMAIL_RE.test(email)) return null
  return email
}

export type PasswordProblem = 'too_short' | 'too_long'

export function passwordProblem(password: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN) return 'too_short'
  if (password.length > PASSWORD_MAX) return 'too_long'
  return null
}
