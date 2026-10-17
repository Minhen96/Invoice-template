import { describe, expect, it } from 'vitest'

import { DEFAULT_COLUMNS, DEFAULT_TEMPLATE, EMPTY_BUSINESS, EMPTY_PAYMENT } from './defaults'
import { fitItemsToColumns, switchTemplate } from './templateSwitch'
import type { InvoiceContent } from './validators'

const content: InvoiceContent = {
  ...DEFAULT_TEMPLATE,
  name: 'Astro – Oct',
  number: '2026001',
  issueDate: '2026-10-15',
  dueDate: '',
  billTo: { name: 'Astro', address: '', attention: '' },
  items: [{ id: 'a', description: 'Hosting', rateSen: 10000, quantity: 2, extra: { date: 'Oct' } }],
  discountSen: 0,
  taxRateBps: 0,
  taxLabel: 'SST',
  notes: 'Keep me',
  from: EMPTY_BUSINESS,
  payment: EMPTY_PAYMENT,
  showPaidStamp: false,
}

describe('fitItemsToColumns', () => {
  it('drops values of missing columns, and uses one amount when Rate/Quantity are hidden', () => {
    expect(
      fitItemsToColumns(content.items, { ...DEFAULT_COLUMNS, showRateQty: false, extra: [] }),
    ).toEqual([{ id: 'a', description: 'Hosting', rateSen: 10000, quantity: 1, extra: {} }])
  })
})

describe('switchTemplate', () => {
  const other = {
    ...DEFAULT_TEMPLATE,
    layout: 'bold' as const,
    title: 'QUOTATION',
    dueDays: 7,
    notes: 'Template note',
    columns: { ...DEFAULT_COLUMNS, extra: [{ id: 'date', label: 'Date' }] },
  }

  it('takes the look, columns and terms; keeps client, items, name and notes', () => {
    expect(switchTemplate(content, other)).toMatchObject({
      layout: 'bold',
      title: 'QUOTATION',
      dueDate: '2026-10-22',
      columns: { extra: [{ id: 'date', label: 'Date' }] },
      billTo: { name: 'Astro' },
      items: [{ description: 'Hosting', extra: { date: 'Oct' } }],
      name: 'Astro – Oct',
      notes: 'Keep me',
    })
  })

  it('fills empty notes from the template, and clears the due date when it has no terms', () => {
    expect(switchTemplate({ ...content, notes: ' ' }, { ...other, dueDays: null })).toMatchObject({
      notes: 'Template note',
      dueDate: '',
    })
  })
})
