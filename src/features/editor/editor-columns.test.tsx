import { api } from '@convex/_generated/api'
import { DEFAULT_COLUMNS } from '@convex/lib/defaults'
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { invoiceDoc, templateDoc } from '@/testing/fixtures'
import { renderApp, screen } from '@/testing/render-app'

/** The paper. Queried directly: while a popup is open the dialog hides the page from a11y queries. */
function previewSection(): HTMLElement {
  const section = document.querySelector<HTMLElement>('section[aria-label="Preview"]')
  if (!section) throw new Error('preview missing')
  return section
}

function withInvoice(partial = {}) {
  fakeConvex.setQuery(api.invoices.get, invoiceDoc(partial))
  fakeConvex.setQuery(api.templates.list, [templateDoc()])
  fakeConvex.setQuery(api.clients.list, [])
  fakeConvex.setQuery(api.items.list, [])
}

type User = Awaited<ReturnType<typeof renderApp>>['user']

/** Close the item popup, press Save, and return the saved content. */
async function save(user: User) {
  await user.click(screen.getByRole('button', { name: 'Done' }))
  await user.click(screen.getByRole('button', { name: 'Save' }))
  const calls = fakeConvex.handler(api.invoices.update).mock.calls
  return (calls.at(-1)?.[0] as { content: Record<string, unknown> } | undefined)?.content
}

describe('items with flexible columns', () => {
  it('gives each item a box for your own columns', async () => {
    withInvoice({ columns: { ...DEFAULT_COLUMNS, extra: [{ id: 'date', label: 'Date' }] } })
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Edit item 1' }))
    await user.type(await screen.findByLabelText('Item 1 Date'), '1–20 Oct')

    const preview = within(previewSection())
    expect(preview.getByRole('columnheader', { name: 'Date', hidden: true })).toBeInTheDocument()
    expect(preview.getByRole('cell', { name: '1–20 Oct', hidden: true })).toBeInTheDocument()
    expect(await save(user)).toMatchObject({ items: [{ extra: { date: '1–20 Oct' } }] })
  })

  it('asks for one amount per item when Rate and Quantity are hidden', async () => {
    withInvoice({
      columns: { ...DEFAULT_COLUMNS, showRateQty: false, amount: 'Amount' },
      items: [{ id: 'a', description: 'Retainer', rateSen: 0, quantity: 1, extra: {} }],
    })
    const { user } = await renderApp('/invoices/inv1')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Edit item 1' }))
    await user.type(await screen.findByLabelText('Amount (RM)'), '3000')
    expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument()
    expect(within(previewSection()).getAllByText('3,000.00').length).toBeGreaterThan(0)
    expect(await save(user)).toMatchObject({ items: [{ rateSen: 300000, quantity: 1 }] })
  })
})
