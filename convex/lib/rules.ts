import { ConvexError } from 'convex/values'

import { isIsoDate } from './dates'
import { MAX_EXTRA_COLUMNS } from './defaults'
import { MAX_SEN } from './money'
import type {
  Business,
  ClientFields,
  InvoiceContent,
  Columns,
  Payment,
  TemplateFields,
} from './validators'

/**
 * Server-side value rules. The UI validates too, but the backend is the boundary: anything that
 * reaches the database has passed these checks. Errors carry a stable `code` the UI maps to copy.
 */

export type AppErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'invalid'
  | 'number_taken'
  | 'duplicate'
  | 'weak_password'
  | 'wrong_password'
  | 'last_template'

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

const COLUMN_ID_RE = /^[a-z0-9]{1,40}$/i

export function checkColumns(value: Columns, prefix = 'columns'): void {
  const { showRateQty: _show, extra, ...headings } = value
  texts(headings, prefix)
  if (extra.length > MAX_EXTRA_COLUMNS) throw appError('invalid', `${prefix}.extra`)
  const ids = new Set<string>()
  extra.forEach((column, i) => {
    if (!COLUMN_ID_RE.test(column.id) || ids.has(column.id)) {
      throw appError('invalid', `${prefix}.extra.${i}.id`)
    }
    ids.add(column.id)
    text(column.label, `${prefix}.extra.${i}.label`, 60)
  })
}

export function checkAccent(value: string, field = 'accent'): void {
  if (!HEX_RE.test(value)) throw appError('invalid', field)
}

export function checkDueDays(value: number | null, field = 'dueDays'): void {
  if (value === null) return
  if (!Number.isInteger(value) || value < 0 || value > LIMITS.dueDays)
    throw appError('invalid', field)
}

export function checkTemplate(value: TemplateFields): void {
  if (value.name.trim() === '' || value.name.length > 60) throw appError('invalid', 'name')
  text(value.title, 'title')
  text(value.currency, 'currency', 10)
  text(value.notes, 'notes', LIMITS.long)
  checkAccent(value.accent)
  checkColumns(value.columns)
  checkDueDays(value.dueDays)
}

export function checkItemFields(value: { description: string; rateSen: number }): void {
  if (value.description.trim() === '') throw appError('invalid', 'description')
  text(value.description, 'description', LIMITS.long)
  sen(value.rateSen, 'rateSen')
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
  text(value.name ?? '', 'name')
  checkNumber(value.number)
  text(value.title, 'title')
  text(value.currency, 'currency', 10)
  text(value.taxLabel, 'taxLabel')
  text(value.notes, 'notes', LIMITS.long)
  checkAccent(value.accent)
  if (!isIsoDate(value.issueDate)) throw appError('invalid', 'issueDate')
  if (value.dueDate !== '' && !isIsoDate(value.dueDate)) throw appError('invalid', 'dueDate')
  texts(value.billTo, 'billTo', ['address'])
  checkColumns(value.columns)
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
    const keys = Object.keys(item.extra)
    if (keys.length > MAX_EXTRA_COLUMNS || keys.some((key) => !COLUMN_ID_RE.test(key))) {
      throw appError('invalid', `items.${i}.extra`)
    }
    for (const [key, cell] of Object.entries(item.extra)) {
      text(cell, `items.${i}.extra.${key}`, 500)
    }
  })
}
