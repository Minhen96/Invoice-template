import { roundSen } from './money'

export interface PricedItem {
  rateSen: number
  quantity: number
}

export interface Totals {
  subtotalSen: number
  discountSen: number
  taxSen: number
  totalSen: number
}

export type PaymentStatus = 'paid' | 'overdue' | 'unpaid'

/** Rate × quantity, rounded to whole sen per line (what the reader sees on each row adds up). */
export function lineAmountSen(item: PricedItem): number {
  if (!Number.isFinite(item.quantity) || !Number.isFinite(item.rateSen)) return 0
  return roundSen(item.rateSen * item.quantity)
}

/**
 * Subtotal → minus discount (never below zero) → plus tax on the discounted amount.
 * `taxRateBps` is basis points: 800 = 8% (Malaysian SST on services).
 */
export function computeTotals(input: {
  items: readonly PricedItem[]
  discountSen: number
  taxRateBps: number
}): Totals {
  const subtotalSen = input.items.reduce((sum, item) => sum + lineAmountSen(item), 0)
  const discountSen = Math.min(Math.max(0, input.discountSen), subtotalSen)
  const taxable = subtotalSen - discountSen
  const taxSen = roundSen((taxable * Math.max(0, input.taxRateBps)) / 10_000)
  return { subtotalSen, discountSen, taxSen, totalSen: taxable + taxSen }
}

/** Paid wins; otherwise overdue once the due date has passed (due today is not overdue yet). */
export function paymentStatus(
  invoice: { status: 'paid' | 'unpaid'; dueDate: string },
  today: string,
): PaymentStatus {
  if (invoice.status === 'paid') return 'paid'
  if (invoice.dueDate !== '' && invoice.dueDate < today) return 'overdue'
  return 'unpaid'
}
