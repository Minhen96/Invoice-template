/**
 * Next invoice number after `current`, keeping the user's own format: the last run of digits is
 * incremented and keeps its zero padding.
 *
 *   "2026031"     → "2026032"
 *   "INV-009"     → "INV-010"
 *   "INV-2026-99" → "INV-2026-100"
 *   "A"           → "A-2"
 */
export function nextInvoiceNumber(current: string): string {
  const value = current.trim()
  if (value === '') return '1'
  const match = /(\d+)(?!.*\d)/.exec(value)
  if (!match) return `${value}-2`
  const digits = match[1] ?? ''
  const incremented = (BigInt(digits) + 1n).toString().padStart(digits.length, '0')
  return value.slice(0, match.index) + incremented + value.slice(match.index + digits.length)
}

/** First number suggested for a brand-new account, e.g. "2026001". */
export function firstInvoiceNumber(today: string): string {
  return `${today.slice(0, 4)}001`
}
