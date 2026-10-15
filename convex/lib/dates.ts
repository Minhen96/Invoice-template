/**
 * Calendar dates are ISO strings (`yyyy-mm-dd`) with no time zone: an invoice dated 7 Oct is
 * 7 Oct for everyone. "Today" always comes from the user's device, never the server clock (the
 * server runs in UTC, eight hours behind Malaysia).
 */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export const DATE_FORMATS = [
  'd/m/yyyy',
  'dd/mm/yyyy',
  'd MMM yyyy',
  'MMMM d, yyyy',
  'yyyy-mm-dd',
] as const
export type DateFormat = (typeof DATE_FORMATS)[number]

interface Ymd {
  y: number
  m: number // 1-12
  d: number
}

function parts(iso: string): Ymd | null {
  const match = ISO_RE.exec(iso)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null
  return { y, m, d }
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function isIsoDate(value: string): boolean {
  return parts(value) !== null
}

/** Local calendar date of a JS Date (defaults to now) as ISO. */
export function localIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, days: number): string {
  const p = parts(iso)
  if (!p) return iso
  return fromUtc(new Date(Date.UTC(p.y, p.m - 1, p.d + days)))
}

/** Same day next month, clamped to the month's last day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const p = parts(iso)
  if (!p) return iso
  const index = p.y * 12 + (p.m - 1) + months
  const y = Math.floor(index / 12)
  const m = (index % 12) + 1
  const d = Math.min(p.d, daysInMonth(y, m))
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Whole days from `a` to `b` (negative when b is earlier). */
export function daysBetween(a: string, b: string): number {
  const pa = parts(a)
  const pb = parts(b)
  if (!pa || !pb) return 0
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000)
}

export function formatDate(iso: string, format: DateFormat = 'd/m/yyyy'): string {
  const p = parts(iso)
  if (!p) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const month = MONTHS[p.m - 1] ?? ''
  switch (format) {
    case 'dd/mm/yyyy':
      return `${pad(p.d)}/${pad(p.m)}/${p.y}`
    case 'd MMM yyyy':
      return `${p.d} ${month.slice(0, 3)} ${p.y}`
    case 'MMMM d, yyyy':
      return `${month} ${p.d}, ${p.y}`
    case 'yyyy-mm-dd':
      return iso
    case 'd/m/yyyy':
      return `${p.d}/${p.m}/${p.y}`
  }
}
