import type { LayoutId } from '@convex/lib/validators'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { invoiceDoc } from '@/testing/fixtures'

import { contrastRatio, onColor } from './colour'
import { InvoiceDocument } from './invoice-document'
import { printTitle } from './print'
import { buildDocumentView, type DocumentInvoice } from './view-model'

function docInvoice(partial: Partial<DocumentInvoice> = {}): DocumentInvoice {
  const { _id, _creationTime, userId, paidNote, totalSen, ...content } = invoiceDoc()
  return { ...content, ...partial }
}

describe('buildDocumentView', () => {
  it('formats the original invoice like the paper version', () => {
    const view = buildDocumentView(docInvoice(), null)
    expect(view).toMatchObject({
      title: 'INVOICE',
      numberLabel: 'Invoice No.',
      number: '2026031',
      issueDate: '7/10/2026',
      subtotal: '5,000.00',
      total: '5,000.00',
      discount: null,
      tax: null,
      paidOn: null,
    })
    expect(view.columns.map((c) => c.label)).toEqual([
      'Description',
      'Rate Per Session / Hour* (RM)',
      'Quantity (session)',
      'Total (RM)',
    ])
    expect(view.rows).toEqual([
      {
        id: 'a',
        cells: ['FULL TIME ANNOUNCER OCT 2026\n(20 days)', '250.00', '20', '5,000.00'],
      },
    ])
    expect(view.paymentLines).toEqual([
      'IC No: 000000-00-0000',
      'Bank Name: Public Bank',
      'Bank Account: 1234567890',
    ])
  })

  it('skips empty item rows and empty payment lines', () => {
    const view = buildDocumentView(
      docInvoice({
        items: [
          { id: 'x', description: '  ', rateSen: 0, quantity: 1, extra: {} },
          { id: 'y', description: 'Editing', rateSen: 0, quantity: 1.5, extra: {} },
        ],
        payment: {
          accountName: '',
          idLabel: 'IC No',
          idNumber: '',
          bankName: '',
          accountNumber: '',
          extra: 'DuitNow: 0123\n\n',
        },
      }),
      null,
    )
    expect(view.rows.map((r) => r.id)).toEqual(['y'])
    expect(view.rows[0]?.cells[2]).toBe('1.5')
    expect(view.paymentLines).toEqual(['DuitNow: 0123'])
  })

  it('adds your own columns after the description', () => {
    const view = buildDocumentView(
      docInvoice({
        columns: {
          ...invoiceDoc().columns,
          extra: [
            { id: 'date', label: 'Date' },
            { id: 'venue', label: 'Venue' },
          ],
        },
        items: [
          {
            id: 'a',
            description: 'Live show',
            rateSen: 50000,
            quantity: 1,
            extra: { date: '7 Oct', venue: 'Bukit Jalil' },
          },
          // A row with only an extra value still prints.
          { id: 'b', description: '', rateSen: 0, quantity: 1, extra: { date: '8 Oct' } },
        ],
      }),
      null,
    )
    expect(view.columns.map((c) => [c.label, c.kind])).toEqual([
      ['Description', 'desc'],
      ['Date', 'text'],
      ['Venue', 'text'],
      ['Rate Per Session / Hour* (RM)', 'num'],
      ['Quantity (session)', 'num'],
      ['Total (RM)', 'num'],
    ])
    expect(view.rows.map((r) => r.cells)).toEqual([
      ['Live show', '7 Oct', 'Bukit Jalil', '500.00', '1', '500.00'],
      ['', '8 Oct', '', '', '1', '0.00'],
    ])
  })

  it('can show just one amount per item', () => {
    const view = buildDocumentView(
      docInvoice({ columns: { ...invoiceDoc().columns, showRateQty: false, amount: 'Amount' } }),
      null,
    )
    expect(view.columns.map((c) => c.label)).toEqual(['Description', 'Amount (RM)'])
    expect(view.rows[0]?.cells).toEqual(['FULL TIME ANNOUNCER OCT 2026\n(20 days)', '5,000.00'])
  })

  it('shows discount and tax only when used', () => {
    const view = buildDocumentView(docInvoice({ discountSen: 10000, taxRateBps: 800 }), null)
    expect(view.discount).toBe('100.00')
    expect(view.tax).toEqual({ label: 'SST (8%)', amount: '392.00' })
    expect(view.total).toBe('5,292.00')
  })

  it('names the number after the title', () => {
    expect(buildDocumentView(docInvoice({ title: 'QUOTATION' }), null).numberLabel).toBe(
      'Quotation No.',
    )
    expect(buildDocumentView(docInvoice({ title: '  ' }), null).title).toBe('INVOICE')
  })

  it('shows the PAID stamp only when paid and switched on', () => {
    const paid = { status: 'paid' as const, paidAt: '2026-10-20' }
    expect(buildDocumentView(docInvoice({ ...paid, showPaidStamp: false }), null).paidOn).toBeNull()
    expect(buildDocumentView(docInvoice({ ...paid, showPaidStamp: true }), null).paidOn).toBe(
      '20/10/2026',
    )
    expect(buildDocumentView(docInvoice({ showPaidStamp: true }), null).paidOn).toBeNull()
  })
})

describe('InvoiceDocument', () => {
  it.each<LayoutId>(['blush', 'classic', 'minimal', 'bold'])(
    '%s shows everything the client needs',
    (template) => {
      render(
        <InvoiceDocument
          invoice={docInvoice({ layout: template })}
          logoUrl="https://example.com/logo.png"
        />,
      )
      const page = screen.getByRole('article', { name: 'INVOICE 2026031' })
      const inPage = within(page)
      expect(inPage.getByRole('heading', { name: 'INVOICE' })).toBeInTheDocument()
      expect(inPage.getByText('Astro Radio Sdn Bhd')).toBeInTheDocument()
      expect(inPage.getByText(/FULL TIME ANNOUNCER OCT 2026/)).toBeInTheDocument()
      expect(inPage.getAllByText('5,000.00').length).toBeGreaterThan(0)
      expect(inPage.getByText('Bank Account: 1234567890')).toBeInTheDocument()
      expect(inPage.getByText('LIM KAI XIN TRADING AS LIM KAI XIN')).toBeInTheDocument()
      expect(page.querySelector('img')).toHaveAttribute('src', 'https://example.com/logo.png')
    },
  )

  it('Blush keeps three ruled rows like the paper original', () => {
    const { container } = render(<InvoiceDocument invoice={docInvoice()} />)
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3)
  })

  it('draws the PAID stamp', () => {
    render(
      <InvoiceDocument
        invoice={docInvoice({ status: 'paid', paidAt: '2026-10-20', showPaidStamp: true })}
      />,
    )
    expect(screen.getByLabelText('Paid on 20/10/2026')).toBeInTheDocument()
  })
})

describe('printTitle', () => {
  it('makes a tidy file name', () => {
    expect(printTitle(docInvoice())).toBe('Invoice 2026031 - Astro Radio Sdn Bhd')
    expect(
      printTitle(docInvoice({ billTo: { name: 'A/B: "C"', address: '', attention: '' } })),
    ).toBe('Invoice 2026031 - AB C')
  })
})

describe('accent text colour', () => {
  it('picks readable text on every offered accent', () => {
    for (const accent of ['#c2185b', '#6d28d9', '#1d4ed8', '#047857', '#b45309', '#18181b']) {
      expect(contrastRatio(accent, onColor(accent))).toBeGreaterThanOrEqual(4.5)
    }
    expect(onColor('#fde68a')).toBe('#111111')
  })
})
