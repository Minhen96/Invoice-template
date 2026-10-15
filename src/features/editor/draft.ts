import type { Doc } from '@convex/_generated/dataModel'
import type { InvoiceContent, LineItem } from '@convex/lib/validators'

/** The editable part of a stored invoice (what `invoices.update` takes). */
export function toDraft(invoice: Doc<'invoices'>): InvoiceContent {
  return {
    number: invoice.number,
    title: invoice.title,
    template: invoice.template,
    accent: invoice.accent,
    currency: invoice.currency,
    dateFormat: invoice.dateFormat,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    clientId: invoice.clientId,
    billTo: invoice.billTo,
    labels: invoice.labels,
    items: invoice.items,
    discountSen: invoice.discountSen,
    taxRateBps: invoice.taxRateBps,
    taxLabel: invoice.taxLabel,
    notes: invoice.notes,
    from: invoice.from,
    payment: invoice.payment,
    showPaidStamp: invoice.showPaidStamp,
  }
}

export function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', rateSen: 0, quantity: 1 }
}

export function moveItem(items: readonly LineItem[], index: number, by: -1 | 1): LineItem[] {
  const target = index + by
  if (target < 0 || target >= items.length) return [...items]
  const next = [...items]
  const [moved] = next.splice(index, 1)
  if (moved) next.splice(target, 0, moved)
  return next
}
