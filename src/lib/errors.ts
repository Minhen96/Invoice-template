import { ConvexError } from 'convex/values'

import type { AppErrorCode } from '@convex/lib/rules'

/** Stable error code from a backend ConvexError (`{ code, field }`), if there is one. */
export function errorCode(error: unknown): string | null {
  if (error instanceof ConvexError) {
    const data: unknown = error.data
    if (typeof data === 'object' && data !== null && 'code' in data) {
      const { code } = data
      return typeof code === 'string' ? code : null
    }
  }
  return null
}

const MESSAGES: Partial<Record<AppErrorCode, string>> = {
  unauthorized: 'Your session ended. Please log in again.',
  not_found: 'This item no longer exists.',
  invalid: 'Some details look wrong. Please check and try again.',
  number_taken: 'Another invoice already uses this number.',
  weak_password: 'Use at least 8 characters for your password.',
  wrong_password: 'Your current password is not right.',
  last_template: 'Keep at least one template — every invoice starts from one.',
}

/** A short, human message for any error thrown by a Convex call. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const code = errorCode(error)
  if (code !== null && code in MESSAGES) return MESSAGES[code as AppErrorCode] ?? fallback
  return fallback
}
