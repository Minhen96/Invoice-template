import { formatDate } from '@convex/lib/dates'
import { computeTotals, lineAmountSen } from '@convex/lib/invoiceMath'
import { formatSen } from '@convex/lib/money'
import type { InvoiceContent } from '@convex/lib/validators'

/** What a template needs to draw an invoice: the content plus its payment state. */
export type DocumentInvoice = InvoiceContent & { status: 'paid' | 'unpaid'; paidAt: string }

export interface DocumentRow {
  id: string
  description: string
  rate: string
  quantity: string
  amount: string
}

export interface DocumentView {
  title: string
  numberLabel: string
  number: string
  issueDate: string
  dueDate: string
  billTo: InvoiceContent['billTo']
  labels: InvoiceContent['labels']
  rows: DocumentRow[]
  subtotal: string
  discount: string | null
  tax: { label: string; amount: string } | null
  total: string
  currency: string
  notes: string
  from: InvoiceContent['from']
  paymentLines: string[]
  accountName: string
  logoUrl: string | null
  accent: string
  /** Shown as a stamp only when paid and the user turned the stamp on. */
  paidOn: string | null
}

function formatQuantity(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity)
  return String(Math.round(quantity * 1000) / 1000)
}

function formatPercent(bps: number): string {
  return `${String(bps / 100)}%`
}

function titleCase(value: string): string {
  const lower = value.trim().toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Turn stored invoice data into display strings. Pure: same input → same document. */
export function buildDocumentView(invoice: DocumentInvoice, logoUrl: string | null): DocumentView {
  const totals = computeTotals(invoice)
  const currency = invoice.currency.trim()
  const withCurrency = (label: string) => (currency ? `${label} (${currency})` : label)
  const rows = invoice.items
    .filter((item) => item.description.trim() !== '' || item.rateSen > 0)
    .map((item) => ({
      id: item.id,
      description: item.description,
      rate: item.rateSen > 0 ? formatSen(item.rateSen) : '',
      quantity: formatQuantity(item.quantity),
      amount: formatSen(lineAmountSen(item)),
    }))

  const { payment } = invoice
  const paymentLines = [
    payment.idNumber && `${payment.idLabel || 'ID'}: ${payment.idNumber}`,
    payment.bankName && `Bank Name: ${payment.bankName}`,
    payment.accountNumber && `Bank Account: ${payment.accountNumber}`,
    ...payment.extra.split('\n'),
  ].filter((line): line is string => typeof line === 'string' && line.trim() !== '')

  const title = invoice.title.trim() || 'INVOICE'
  return {
    title,
    numberLabel: `${titleCase(title)} No.`,
    number: invoice.number,
    issueDate: formatDate(invoice.issueDate, invoice.dateFormat),
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate, invoice.dateFormat) : '',
    billTo: invoice.billTo,
    labels: {
      description: invoice.labels.description,
      rate: withCurrency(invoice.labels.rate),
      quantity: invoice.labels.quantity,
      amount: withCurrency(invoice.labels.amount),
    },
    rows,
    subtotal: formatSen(totals.subtotalSen),
    discount: totals.discountSen > 0 ? formatSen(totals.discountSen) : null,
    tax:
      invoice.taxRateBps > 0
        ? {
            label: `${invoice.taxLabel || 'Tax'} (${formatPercent(invoice.taxRateBps)})`,
            amount: formatSen(totals.taxSen),
          }
        : null,
    total: formatSen(totals.totalSen),
    currency,
    notes: invoice.notes,
    from: invoice.from,
    paymentLines,
    accountName: payment.accountName,
    logoUrl,
    accent: invoice.accent,
    paidOn:
      invoice.status === 'paid' && invoice.showPaidStamp
        ? formatDate(invoice.paidAt, invoice.dateFormat)
        : null,
  }
}
