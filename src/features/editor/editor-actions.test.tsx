import { api } from '@convex/_generated/api'
import { waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { invoiceDoc, profileResult } from '@/testing/fixtures'
import { currentPath, renderApp, screen } from '@/testing/render-app'

function withInvoice(partial = {}) {
  fakeConvex.setQuery(api.invoices.get, invoiceDoc(partial))
  fakeConvex.setQuery(api.profiles.get, profileResult())
  fakeConvex.setQuery(api.clients.list, [])
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
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Mark as unpaid' }))
    expect(fakeConvex.handler(api.invoices.setStatus)).toHaveBeenCalledWith({
      id: 'inv1',
      status: 'unpaid',
    })
  })

  it('duplicates for next month and opens the copy', async () => {
    withInvoice()
    fakeConvex.handler(api.invoices.duplicate).mockResolvedValue('copy1')
    const { user, router } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Duplicate for next month' }))
    await waitFor(() => {
      expect(currentPath(router)).toBe('/invoices/copy1')
    })
    expect(fakeConvex.handler(api.invoices.duplicate)).toHaveBeenCalledWith({
      id: 'inv1',
      today: '2026-10-15',
      nextMonth: true,
    })
  })

  it('deletes after confirming', async () => {
    withInvoice()
    fakeConvex.setQuery(api.invoices.list, [])
    const { user, router } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
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

  it('adds discount and tax to the total', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.type(screen.getByLabelText('Discount'), '100')
    await user.type(screen.getByLabelText('Tax %'), '8')
    expect(screen.getByText('RM 5,292.00')).toBeInTheDocument()
  })

  it('saves a typed-in client to the client list', async () => {
    withInvoice()
    fakeConvex.handler(api.clients.create).mockResolvedValue('c9')
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Save as client' }))
    expect(fakeConvex.handler(api.clients.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Astro Radio Sdn Bhd',
        attention: 'Accounts Payable Department',
      }),
    )
  })

  it('edits this invoice’s own business and bank details', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByText('Payment details'))
    const bank = screen.getAllByLabelText('Bank')[0]!
    await user.clear(bank)
    await user.type(bank, 'Maybank')
    const preview = within(screen.getByRole('region', { name: 'Preview' }))
    expect(preview.getByText('Bank Name: Maybank')).toBeInTheDocument()
  })
})

describe('print preview on phones', () => {
  it('switches between the form and the preview', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    const previewTab = screen.getByRole('tab', { name: 'Preview' })
    await user.click(previewTab)
    expect(previewTab).toHaveAttribute('aria-selected', 'true')
  })
})
