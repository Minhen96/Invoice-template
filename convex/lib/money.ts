/**
 * Money is stored as integer sen (cents) everywhere. Floats only appear at the edges: parsing
 * what the user typed and multiplying by a quantity, where the result is rounded straight back
 * to whole sen.
 */

/** Largest amount we accept (RM 10 billion) — far above any real invoice, well inside 2^53. */
export const MAX_SEN = 1_000_000_000_000

/** Round half away from zero to a whole sen (avoids 1.005 → 1.00 float surprises). */
export function roundSen(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value) + Number.EPSILON * Math.abs(value))
}

/**
 * Parse user input like "1,234.50", "RM 20" or "0.5" into sen. Returns null when it is not a
 * plain non-negative amount with at most two decimals.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/rm/gi, '').replace(/[\s,]/g, '')
  if (cleaned === '') return 0
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned) && !/^\.\d{1,2}$/.test(cleaned)) return null
  const [whole = '0', frac = ''] = cleaned.split('.')
  const sen = Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'))
  return sen > MAX_SEN ? null : sen
}

/** 123456 → "1,234.56" (no currency symbol; templates place the currency themselves). */
export function formatSen(sen: number): string {
  const negative = sen < 0
  const abs = Math.abs(Math.trunc(sen))
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const frac = (abs % 100).toString().padStart(2, '0')
  return `${negative ? '-' : ''}${whole}.${frac}`
}

/** 123450 → "1234.50" — for editable inputs (no thousands separators). */
export function senToInput(sen: number): string {
  return (sen / 100).toFixed(2)
}
