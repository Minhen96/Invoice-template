import type { Doc } from '@convex/_generated/dataModel'
import type { InvoiceContent } from '@convex/lib/validators'

/** The editable part of a stored invoice (what `invoices.update` takes). */
export function toDraft(invoice: Doc<'invoices'>): InvoiceContent {
  return {
    name: invoice.name ?? '',
    number: invoice.number,
    title: invoice.title,
    layout: invoice.layout,
    accent: invoice.accent,
    currency: invoice.currency,
    dateFormat: invoice.dateFormat,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    clientId: invoice.clientId,
    billTo: invoice.billTo,
    columns: invoice.columns,
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
