import { addDays } from './dates'
import type { Columns, InvoiceContent, LineItem, TemplateFields } from './validators'

/**
 * Keep items consistent with the columns: with Rate/Quantity hidden each item is one amount
 * (quantity 1), and values of columns that no longer exist are dropped.
 */
export function fitItemsToColumns(items: readonly LineItem[], columns: Columns): LineItem[] {
  const ids = new Set(columns.extra.map((column) => column.id))
  return items.map((item) => ({
    ...item,
    quantity: columns.showRateQty ? item.quantity : 1,
    extra: Object.fromEntries(Object.entries(item.extra).filter(([id]) => ids.has(id))),
  }))
}

/**
 * Restyle an invoice with another template: look, columns and payment terms change; the
 * client, items, dates and business/bank details stay. Notes come from the template only when
 * the invoice has none.
 */
export function switchTemplate(content: InvoiceContent, template: TemplateFields): InvoiceContent {
  return {
    ...content,
    title: template.title,
    layout: template.layout,
    accent: template.accent,
    currency: template.currency,
    dateFormat: template.dateFormat,
    columns: template.columns,
    items: fitItemsToColumns(content.items, template.columns),
    dueDate: template.dueDays === null ? '' : addDays(content.issueDate, template.dueDays),
    notes: content.notes.trim() === '' ? template.notes : content.notes,
  }
}
