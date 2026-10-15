import { ConvexError } from 'convex/values'

import { isIsoDate } from './dates'
import { MAX_SEN } from './money'
import type {
  Business,
  ClientFields,
  InvoiceContent,
  Labels,
  Payment,
  ProfileDefaults,
} from './validators'

/**
 * Server-side value rules. The UI validates too, but the backend is the boundary: anything that
 * reaches the database has passed these checks. Errors carry a stable `code` the UI maps to copy.
 */

export type AppErrorCode =
  'unauthorized' | 'not_found' | 'invalid' | 'number_taken' | 'weak_password' | 'wrong_password'

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- a type alias (not an interface) satisfies Convex's `Value` constraint
export type AppErrorData = {
  code: AppErrorCode
  field?: string
}

export function appError(code: AppErrorCode, field?: string): ConvexError<AppErrorData> {
  return new ConvexError<AppErrorData>(field === undefined ? { code } : { code, field })
}

export const LIMITS = {
  short: 200,
  long: 2_000,
  items: 100,
  quantity: 1_000_000,
  dueDays: 365,
} as const

const HEX_RE = /^#[0-9a-f]{6}$/i

function text(value: string, field: string, max: number = LIMITS.short): void {
  if (value.length > max) throw appError('invalid', field)
}

function texts(record: Record<string, string>, prefix: string, long: readonly string[] = []): void {
  for (const [key, value] of Object.entries(record)) {
    const field = prefix === '' ? key : `${prefix}.${key}`
    text(value, field, long.includes(key) ? LIMITS.long : LIMITS.short)
  }
}

function sen(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_SEN) throw appError('invalid', field)
}

export function checkBusiness(value: Business, prefix = 'from'): void {
  texts(value, prefix, ['address'])
}

export function checkPayment(value: Payment, prefix = 'payment'): void {
  texts(value, prefix, ['extra'])
}

export function checkLabels(value: Labels, prefix = 'labels'): void {
  texts(value, prefix)
}

export function checkAccent(value: string, field = 'accent'): void {
  if (!HEX_RE.test(value)) throw appError('invalid', field)
}

export function checkDefaults(value: ProfileDefaults): void {
  text(value.title, 'defaults.title')
  text(value.currency, 'defaults.currency', 10)
  text(value.notes, 'defaults.notes', LIMITS.long)
  checkAccent(value.accent, 'defaults.accent')
  checkLabels(value.labels, 'defaults.labels')
  if (
    value.dueDays !== null &&
    (!Number.isInteger(value.dueDays) || value.dueDays < 0 || value.dueDays > LIMITS.dueDays)
  ) {
    throw appError('invalid', 'defaults.dueDays')
  }
}

export function checkNumber(value: string, field = 'number'): void {
  if (value.trim() === '' || value.length > 50) throw appError('invalid', field)
}

export function checkClient(value: ClientFields): void {
  if (value.name.trim() === '') throw appError('invalid', 'name')
  if (value.email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    throw appError('invalid', 'email')
  }
  texts({ ...value }, '', ['address', 'notes'])
}

export function checkInvoice(value: InvoiceContent): void {
  checkNumber(value.number)
  text(value.title, 'title')
  text(value.currency, 'currency', 10)
  text(value.taxLabel, 'taxLabel')
  text(value.notes, 'notes', LIMITS.long)
  checkAccent(value.accent)
  if (!isIsoDate(value.issueDate)) throw appError('invalid', 'issueDate')
  if (value.dueDate !== '' && !isIsoDate(value.dueDate)) throw appError('invalid', 'dueDate')
  texts(value.billTo, 'billTo', ['address'])
  checkLabels(value.labels)
  checkBusiness(value.from)
  checkPayment(value.payment)
  sen(value.discountSen, 'discountSen')
  if (!Number.isInteger(value.taxRateBps) || value.taxRateBps < 0 || value.taxRateBps > 10_000) {
    throw appError('invalid', 'taxRateBps')
  }
  if (value.items.length > LIMITS.items) throw appError('invalid', 'items')
  value.items.forEach((item, i) => {
    text(item.id, `items.${i}.id`, 64)
    text(item.description, `items.${i}.description`, LIMITS.long)
    sen(item.rateSen, `items.${i}.rateSen`)
    if (!Number.isFinite(item.quantity) || item.quantity < 0 || item.quantity > LIMITS.quantity) {
      throw appError('invalid', `items.${i}.quantity`)
    }
  })
}
