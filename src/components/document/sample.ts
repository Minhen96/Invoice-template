import { addDays } from '@convex/lib/dates'
import { EMPTY_BUSINESS, EMPTY_PAYMENT } from '@convex/lib/defaults'
import type { Business, Payment, TemplateFields } from '@convex/lib/validators'

import type { DocumentInvoice } from './view-model'

/**
 * A pretend invoice drawn with a template, so a template can be previewed before any real
 * invoice uses it.
 */
export function sampleInvoice(
  template: TemplateFields,
  today: string,
  /** The business and bank details the template uses, shown as on a real invoice. */
  parties: { business: Business; payment: Payment } | null = null,
): DocumentInvoice {
  return {
    number: '0001',
    title: template.title,
    layout: template.layout,
    accent: template.accent,
    currency: template.currency,
    dateFormat: template.dateFormat,
    issueDate: today,
    dueDate: template.dueDays === null ? '' : addDays(today, template.dueDays),
    billTo: { name: 'Client name', address: 'Client address', attention: '' },
    columns: template.columns,
    items: [
      {
        id: 'sample',
        description: 'Example item',
        rateSen: 10000,
        quantity: 1,
        extra: Object.fromEntries(template.columns.extra.map((c) => [c.id, c.label])),
      },
    ],
    discountSen: 0,
    taxRateBps: 0,
    taxLabel: 'SST',
    notes: template.notes,
    from: parties?.business ?? EMPTY_BUSINESS,
    payment: parties?.payment ?? EMPTY_PAYMENT,
    showPaidStamp: false,
    status: 'unpaid',
    paidAt: '',
  }
}
