import { describe, expect, it } from 'vitest'

import { countByFilter, filterInvoices, formatAmounts, summarise, type InvoiceRow } from './summary'

const TODAY = '2026-10-15'

function row(partial: Partial<InvoiceRow> & { _id: string }): InvoiceRow {
  return {
    number: partial._id,
    title: 'INVOICE',
    clientName: 'Astro Radio Sdn Bhd',
    issueDate: '2026-10-01',
    dueDate: '2026-10-31',
    currency: 'RM',
    totalSen: 100000,
    status: 'unpaid',
    paidAt: '',
    ...partial,
  }
}

const rows = [
  row({ _id: 'open' }),
  row({ _id: 'late', dueDate: '2026-10-01', totalSen: 50000 }),
  row({ _id: 'paid', status: 'paid', paidAt: '2026-10-05', totalSen: 20000 }),
  row({ _id: 'old-paid', issueDate: '2025-12-01', status: 'paid', paidAt: '2025-12-20' }),
  row({ _id: 'usd', currency: 'USD', totalSen: 1500, clientName: 'Acme Inc' }),
]

describe('summarise', () => {
  it('adds up outstanding and this year, per currency', () => {
    expect(summarise(rows, TODAY)).toEqual({
      outstanding: { RM: 150000, USD: 1500 },
      outstandingCount: 3,
      paidThisYear: { RM: 20000 },
    })
  })

  it('is all zero with no invoices', () => {
    expect(summarise([], TODAY).outstandingCount).toBe(0)
  })
})

describe('formatAmounts', () => {
  it('puts the preferred currency first', () => {
    expect(formatAmounts({ USD: 1500, RM: 150000 })).toBe('RM 1,500.00 · USD 15.00')
  })
  it('shows zero in the preferred currency', () => {
    expect(formatAmounts({})).toBe('RM 0.00')
    expect(formatAmounts({ RM: 0 }, 'USD')).toBe('USD 0.00')
  })
})

describe('filterInvoices', () => {
  const ids = (status: 'all' | 'unpaid' | 'paid', q = '') =>
    filterInvoices(rows, { status, q }).map((r) => r._id)

  it('filters by status (past the due date is still just unpaid)', () => {
    expect(ids('all')).toHaveLength(5)
    expect(ids('unpaid')).toEqual(['open', 'late', 'usd'])
    expect(ids('paid')).toEqual(['paid', 'old-paid'])
  })

  it('searches number, client and amount, ignoring case', () => {
    expect(ids('all', 'acme')).toEqual(['usd'])
    expect(ids('all', 'LATE')).toEqual(['late'])
    expect(ids('all', '500.00')).toEqual(['late'])
    expect(ids('paid', 'acme')).toEqual([])
  })
})

describe('countByFilter', () => {
  it('counts each tab', () => {
    expect(countByFilter(rows)).toEqual({ all: 5, unpaid: 3, paid: 2 })
  })
})
