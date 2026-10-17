import { api } from '@convex/_generated/api'
import { waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { invoiceDoc, templateDoc } from '@/testing/fixtures'
import { currentPath, renderApp, screen } from '@/testing/render-app'

/** The paper. Queried directly: while a popup is open the dialog hides the page from a11y queries. */
function previewSection(): HTMLElement {
  const section = document.querySelector<HTMLElement>('section[aria-label="Preview"]')
  if (!section) throw new Error('preview missing')
  return section
}

function withInvoice(partial = {}) {
  fakeConvex.setQuery(api.invoices.get, invoiceDoc(partial))
  fakeConvex.setQuery(api.templates.list, [templateDoc()])
  fakeConvex.setQuery(api.items.list, [])
  fakeConvex.setQuery(api.clients.list, [])
}

function paper() {
  return within(previewSection())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('editor actions', () => {
  it('marks the invoice as paid', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    const dialog = await screen.findByRole('dialog', { name: 'Mark 2026031 as paid' })
    await user.click(within(dialog).getByRole('button', { name: 'Mark as paid' }))
    expect(fakeConvex.handler(api.invoices.setStatus)).toHaveBeenCalledWith({
      id: 'inv1',
      status: 'paid',
      paidAt: '2026-10-15',
      paidNote: '',
    })
  })

  it('can undo a payment', async () => {
    withInvoice({ status: 'paid', paidAt: '2026-10-20' })
    const { user } = await renderApp('/invoices/inv1')
    expect(screen.getByText('Paid 20 Oct 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as unpaid' }))
    expect(fakeConvex.handler(api.invoices.setStatus)).toHaveBeenCalledWith({
      id: 'inv1',
      status: 'unpaid',
    })
  })

  it('keeps the toolbar short: no "More actions" menu', async () => {
    withInvoice()
    await renderApp('/invoices/inv1')
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument()
  })

  it('deletes after confirming', async () => {
    withInvoice()
    fakeConvex.setQuery(api.invoices.list, [])
    const { user, router } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Delete invoice' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete 2026031?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(fakeConvex.handler(api.invoices.remove)).toHaveBeenCalledWith({ id: 'inv1' })
    await waitFor(() => {
      expect(currentPath(router)).toBe('/')
    })
  })

  it('prints the invoice with a tidy file name', async () => {
    withInvoice()
    const print = vi.fn()
    vi.stubGlobal('print', print)
    const root = document.createElement('div')
    root.id = 'print-root'
    document.body.appendChild(root)
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Download PDF' }))
    await waitFor(() => {
      expect(print).toHaveBeenCalledOnce()
    })
    expect(document.title).toBe('Invoice 2026031 - Astro Radio Sdn Bhd')
    const printed = document.getElementById('print-root')
    expect(printed?.querySelector('.doc-page')).not.toBeNull()

    window.dispatchEvent(new Event('afterprint'))
    expect(printed?.querySelector('.doc-page')).toBeNull()
    root.remove()
  })

  it('adds discount and tax from the totals on the paper', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(paper().getByRole('button', { name: 'Edit discount and tax' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Discount & tax' }))
    await user.type(dialog.getByLabelText('Discount'), '100')
    await user.type(dialog.getByLabelText('Tax %'), '8')
    expect(dialog.getByText('RM 5,292.00')).toBeInTheDocument()
    expect(paper().getByText('SST (8%)')).toBeInTheDocument()
  })

  it('saves a typed-in client to the client list', async () => {
    withInvoice()
    fakeConvex.handler(api.clients.create).mockResolvedValue('c9')
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(paper().getByRole('button', { name: "Edit who it's billed to" }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Bill to' }))
    await user.click(dialog.getByRole('button', { name: 'Save as client' }))
    expect(fakeConvex.handler(api.clients.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Astro Radio Sdn Bhd',
        attention: 'Accounts Payable Department',
      }),
    )
  })

  it('edits this invoice’s own bank details from the paper', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(paper().getByRole('button', { name: 'Edit payment details' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Payment details' }))
    const bank = dialog.getByLabelText('Bank')
    await user.clear(bank)
    await user.type(bank, 'Maybank')
    expect(paper().getByText('Bank Name: Maybank')).toBeInTheDocument()
  })

  it('edits this invoice’s own business details from the paper', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(paper().getByRole('button', { name: 'Edit your business details' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Your business' }))
    await user.clear(dialog.getByLabelText('Business name'))
    await user.type(dialog.getByLabelText('Business name'), 'Studio B')
    expect(paper().getByText('Studio B')).toBeInTheDocument()
  })
})

describe('on phones', () => {
  it('has big buttons for the parts you change most', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const quick = within(screen.getByRole('group', { name: 'Quick edit' }))
    await user.click(quick.getByRole('button', { name: 'Dates' }))
    expect(await screen.findByRole('dialog', { name: 'Number & dates' })).toBeInTheDocument()
  })
})
