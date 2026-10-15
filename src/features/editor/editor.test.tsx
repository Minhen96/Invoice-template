import { api } from '@convex/_generated/api'
import { ConvexError } from 'convex/values'
import { waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { invoiceDoc, profileResult } from '@/testing/fixtures'
import { expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

import { AUTOSAVE_DELAY_MS } from './use-autosave'

function withInvoice(partial = {}) {
  fakeConvex.setQuery(api.invoices.get, invoiceDoc(partial))
  fakeConvex.setQuery(api.profiles.get, profileResult())
  fakeConvex.setQuery(api.clients.list, [])
}

function preview() {
  return within(screen.getByRole('region', { name: 'Preview' }))
}

/** The last `content` sent to invoices.update. */
function lastSaved() {
  const calls = fakeConvex.handler(api.invoices.update).mock.calls
  return (calls.at(-1)?.[0] as { content: Record<string, unknown> } | undefined)?.content
}

const SAVE_WAIT = { timeout: AUTOSAVE_DELAY_MS + 2000 }

describe('invoice editor', () => {
  it('shows a friendly message for a missing invoice', async () => {
    fakeConvex.setQuery(api.invoices.get, null)
    await renderApp('/invoices/gone')
    expect(screen.getByText("This invoice doesn't exist.")).toBeInTheDocument()
  })

  it('shows the invoice in the live preview', async () => {
    withInvoice()
    await renderApp('/invoices/inv1')
    expect(screen.getByRole('heading', { name: '2026031', level: 1 })).toBeInTheDocument()
    expect(preview().getByText('Astro Radio Sdn Bhd')).toBeInTheDocument()
    expect(preview().getAllByText('5,000.00').length).toBeGreaterThan(0)
    await expectNoA11yViolations()
  })

  it('updates the preview while typing and saves shortly after', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    const qty = screen.getByLabelText('Quantity (session)')
    await user.clear(qty)
    await user.type(qty, '22')

    expect(preview().getAllByText('5,500.00').length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(lastSaved()).toMatchObject({
        items: [expect.objectContaining({ id: 'a', quantity: 22, rateSen: 25000 })],
      })
    }, SAVE_WAIT)
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('never saves an amount it cannot read', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    const rate = screen.getByLabelText(/Rate Per Session/)
    await user.clear(rate)
    await user.type(rate, '12x')
    expect(rate).toHaveAttribute('aria-invalid', 'true')
    await new Promise((resolve) => setTimeout(resolve, AUTOSAVE_DELAY_MS + 200))
    // Clearing set it to 0 (valid), "1" and "12" were valid; "12x" was never sent.
    const sent = fakeConvex
      .handler(api.invoices.update)
      .mock.calls.map(
        (call) =>
          (call[0] as { content: { items: { rateSen: number }[] } }).content.items[0]?.rateSen,
      )
    expect(sent.at(-1)).toBe(1200)
  })

  it('shows "number taken" next to the number field', async () => {
    withInvoice()
    fakeConvex
      .handler(api.invoices.update)
      .mockRejectedValue(new ConvexError({ code: 'number_taken', field: 'number' }))
    const { user } = await renderApp('/invoices/inv1')
    const number = screen.getByLabelText('Number')
    await user.clear(number)
    await user.type(number, '2026030')
    expect(
      await screen.findAllByText('Another invoice already uses this number.', {}, SAVE_WAIT),
    ).not.toHaveLength(0)
    expect(number).toHaveAttribute('aria-invalid', 'true')
  })

  it('switches template from the thumbnails', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('region', { name: 'Preview' }).querySelector('.tpl-bold'),
    ).not.toBeNull()
    await waitFor(() => {
      expect(lastSaved()).toMatchObject({ template: 'bold' })
    }, SAVE_WAIT)
  })

  it('fills "Bill to" from a saved client, including their usual notes', async () => {
    withInvoice({ billTo: { name: '', address: '', attention: '' }, notes: '' })
    fakeConvex.setQuery(api.clients.list, [
      {
        _id: 'c1',
        _creationTime: 0,
        userId: 'user1',
        name: 'Acme Sdn Bhd',
        address: 'Jalan Ampang',
        attention: 'Finance',
        email: '',
        notes: 'Vendor code: 42',
      },
    ])
    const { user } = await renderApp('/invoices/inv1')
    await user.selectOptions(screen.getByLabelText('Saved client'), 'c1')
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Sdn Bhd')
    expect(preview().getByText('Vendor code: 42')).toBeInTheDocument()
  })

  it('adds, reorders and removes items', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    const descriptions = screen.getAllByPlaceholderText(/What is it for/)
    await user.type(descriptions[1]!, 'Voice-over')
    await user.click(screen.getByRole('button', { name: 'Move item 2 up' }))
    expect(screen.getAllByPlaceholderText(/What is it for/)[0]).toHaveValue('Voice-over')
    await user.click(screen.getByRole('button', { name: 'Remove item 1' }))
    expect(screen.getAllByPlaceholderText(/What is it for/)).toHaveLength(1)
    expect(screen.getAllByPlaceholderText(/What is it for/)[0]).toHaveValue(
      'FULL TIME ANNOUNCER OCT 2026\n(20 days)',
    )
  })

  it('moves the due date with the payment terms chips', async () => {
    withInvoice()
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: '14 days' }))
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-10-21')
    await user.click(screen.getByRole('button', { name: 'None' }))
    expect(screen.getByLabelText('Due date')).toHaveValue('')
  })

  it('offers the PAID stamp only on paid invoices', async () => {
    withInvoice({ status: 'paid', paidAt: '2026-10-20' })
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('checkbox', { name: /PAID/ }))
    expect(preview().getByLabelText('Paid on 20/10/2026')).toBeInTheDocument()
  })
})
