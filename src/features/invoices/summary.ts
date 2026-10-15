import { paymentStatus, type PaymentStatus } from '@convex/lib/invoiceMath'
import { formatSen } from '@convex/lib/money'

/** The light invoice rows returned by `invoices.list`. */
export interface InvoiceRow {
  _id: string
  number: string
  title: string
  clientId?: string | undefined
  clientName: string
  issueDate: string
  dueDate: string
  currency: string
  totalSen: number
  status: 'paid' | 'unpaid'
  paidAt: string
}

/** Sums per currency (invoices may use different currencies; never add RM to USD). */
export type Amounts = Record<string, number>

export interface Summary {
  outstanding: Amounts
  outstandingCount: number
  overdue: Amounts
  overdueCount: number
  paidThisYear: Amounts
  invoicedThisYear: Amounts
}

function add(amounts: Amounts, currency: string, sen: number): void {
  amounts[currency] = (amounts[currency] ?? 0) + sen
}

/** Dashboard figures. "This year" follows the payment date for paid and the issue date for invoiced. */
export function summarise(rows: readonly InvoiceRow[], today: string): Summary {
  const year = today.slice(0, 4)
  const summary: Summary = {
    outstanding: {},
    outstandingCount: 0,
    overdue: {},
    overdueCount: 0,
    paidThisYear: {},
    invoicedThisYear: {},
  }
  for (const row of rows) {
    const status = paymentStatus(row, today)
    if (row.issueDate.startsWith(year)) add(summary.invoicedThisYear, row.currency, row.totalSen)
    if (status === 'paid') {
      if (row.paidAt.startsWith(year)) add(summary.paidThisYear, row.currency, row.totalSen)
      continue
    }
    add(summary.outstanding, row.currency, row.totalSen)
    summary.outstandingCount++
    if (status === 'overdue') {
      add(summary.overdue, row.currency, row.totalSen)
      summary.overdueCount++
    }
  }
  return summary
}

/** "RM 1,234.00" or "RM 1,000.00 · USD 20.00"; the preferred currency comes first. */
export function formatAmounts(amounts: Amounts, preferred = 'RM'): string {
  const entries = Object.entries(amounts).filter(([, sen]) => sen !== 0)
  if (entries.length === 0) return `${preferred} 0.00`.trim()
  entries.sort(([a], [b]) => (a === preferred ? -1 : b === preferred ? 1 : a.localeCompare(b)))
  return entries.map(([currency, sen]) => `${currency} ${formatSen(sen)}`.trim()).join(' · ')
}

export const STATUS_FILTERS = ['all', 'unpaid', 'overdue', 'paid'] as const
export type StatusFilter = (typeof STATUS_FILTERS)[number]

/**
 * Filter by status tab and a free-text search over number, client and amount. "Unpaid" includes
 * overdue invoices (they are unpaid too).
 */
export function filterInvoices(
  rows: readonly InvoiceRow[],
  { status, q }: { status: StatusFilter; q: string },
  today: string,
): InvoiceRow[] {
  const query = q.trim().toLowerCase()
  return rows.filter((row) => {
    const rowStatus: PaymentStatus = paymentStatus(row, today)
    if (status === 'paid' && rowStatus !== 'paid') return false
    if (status === 'unpaid' && rowStatus === 'paid') return false
    if (status === 'overdue' && rowStatus !== 'overdue') return false
    if (query === '') return true
    return [row.number, row.clientName, formatSen(row.totalSen)].some((field) =>
      field.toLowerCase().includes(query),
    )
  })
}

export function countByFilter(
  rows: readonly InvoiceRow[],
  today: string,
): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { all: rows.length, unpaid: 0, overdue: 0, paid: 0 }
  for (const row of rows) {
    const status = paymentStatus(row, today)
    if (status === 'paid') counts.paid++
    else {
      counts.unpaid++
      if (status === 'overdue') counts.overdue++
    }
  }
  return counts
}
