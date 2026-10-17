import { api } from '@convex/_generated/api'
import { waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { businessDoc, listRow, templateDoc } from '@/testing/fixtures'
import { currentPath, expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

const rows = [
  listRow({
    _id: 'inv3' as never,
    number: '2026033',
    clientName: 'Acme Sdn Bhd',
    issueDate: '2026-10-10',
    dueDate: '2026-11-09',
    totalSen: 120000,
  }),
  listRow({
    _id: 'inv2' as never,
    name: 'Astro – Sep 2026',
    number: '2026032',
    dueDate: '2026-10-01',
    totalSen: 50000,
  }),
  listRow({ _id: 'inv1' as never, number: '2026031', status: 'paid', paidAt: '2026-10-05' }),
]

function withData() {
  fakeConvex.setQuery(api.invoices.list, rows)
  fakeConvex.setQuery(api.templates.list, [templateDoc()])
}

function table() {
  return screen.getByRole('list', { name: 'Invoices' })
}

describe('invoices dashboard', () => {
  it('shows skeletons while loading', async () => {
    await renderApp('/')
    expect(screen.getByRole('status', { name: 'Loading invoices' })).toBeInTheDocument()
  })

  it('sums what is outstanding and paid this year (no "overdue")', async () => {
    withData()
    await renderApp('/')
    const summary = screen.getByRole('region', { name: 'Summary' })
    expect(within(summary).getByText('RM 1,700.00')).toBeInTheDocument() // outstanding
    expect(within(summary).getByText('2 unpaid')).toBeInTheDocument()
    expect(within(summary).getByText('RM 5,000.00')).toBeInTheDocument() // paid in 2026
    expect(within(summary).queryByText(/Invoiced in/)).not.toBeInTheDocument()
    expect(screen.queryByText(/overdue|past due/i)).not.toBeInTheDocument()
  })

  it('lists invoices with their status', async () => {
    withData()
    await renderApp('/')
    const body = within(table())
    expect(body.getByRole('link', { name: '2026033' })).toHaveAttribute('href', '/invoices/inv3')
    // Past its due date, an invoice is still just "Unpaid".
    expect(body.getAllByText('Unpaid')).toHaveLength(2)
    expect(body.getByText('Paid')).toBeInTheDocument()
    await expectNoA11yViolations()
  })

  it('filters by status tab and keeps the filter in the URL', async () => {
    withData()
    const { user, router } = await renderApp('/')
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'All3',
      'Unpaid2',
      'Paid1',
    ])
    await user.click(screen.getByRole('tab', { name: /Paid/ }))
    expect(router.state.location.search).toMatchObject({ status: 'paid' })
    const links = within(table()).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['2026031'])
  })

  it('searches by client', async () => {
    withData()
    const { user } = await renderApp('/')
    await user.type(screen.getByRole('searchbox', { name: 'Search invoices' }), 'acme')
    await waitFor(() => {
      expect(
        within(table())
          .getAllByRole('link')
          .map((l) => l.textContent),
      ).toEqual(['2026033'])
    })
  })

  it('shows each invoice as a card with its name (number beside it) and a preview', async () => {
    withData()
    await renderApp('/')
    const article = screen.getByRole('article', { name: 'Astro – Sep 2026' })
    const card = within(article)
    expect(card.getByText(/^2026032 · /)).toBeInTheDocument()
    expect(card.getByText('RM 500.00')).toBeInTheDocument()
    // The preview is the real invoice drawn small, hidden from screen readers.
    expect(article.querySelector('[aria-hidden="true"] .doc-page')).not.toBeNull()
  })

  it('searches by invoice name', async () => {
    withData()
    const { user } = await renderApp('/')
    await user.type(screen.getByRole('searchbox', { name: 'Search invoices' }), 'sep 2026')
    await waitFor(() => {
      expect(
        within(table())
          .getAllByRole('link')
          .map((l) => l.textContent),
      ).toEqual(['Astro – Sep 2026'])
    })
  })

  it('has a "Create invoice" box beside the figures', async () => {
    withData()
    fakeConvex.setQuery(api.clients.list, [])
    fakeConvex.setQuery(api.profiles.get, null)
    fakeConvex.setQuery(api.businesses.list, [])
    fakeConvex.setQuery(api.bankAccounts.list, [])
    fakeConvex.setQuery(api.items.list, [])
    const { user } = await renderApp('/')
    const summary = within(screen.getByRole('region', { name: 'Summary' }))
    await user.click(summary.getByRole('button', { name: /Create invoice/ }))
    expect(await screen.findByRole('dialog', { name: 'New invoice' })).toBeInTheDocument()
  })

  it('says so when nothing matches', async () => {
    withData()
    await renderApp('/?q=zzz')
    expect(screen.getByText('No invoices match.')).toBeInTheDocument()
  })

  it('guides a brand-new account: business details first', async () => {
    fakeConvex.setQuery(api.invoices.list, [])
    fakeConvex.setQuery(api.templates.list, [])
    fakeConvex.setQuery(api.businesses.list, [])
    const { router, user } = await renderApp('/')
    expect(screen.getByText('No invoices yet.')).toBeInTheDocument()
    expect(screen.getByText('Add your business details')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Open account/ }))
    expect(currentPath(router)).toBe('/account')
  })

  it('then guides to setting up a template', async () => {
    fakeConvex.setQuery(api.invoices.list, [])
    fakeConvex.setQuery(api.templates.list, [])
    fakeConvex.setQuery(api.businesses.list, [businessDoc()])
    const { router, user } = await renderApp('/')
    expect(screen.getByText('Set up your invoice template')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Set up template/ }))
    expect(currentPath(router)).toBe('/templates')
  })

  it('opens the New invoice popup from the empty state', async () => {
    fakeConvex.setQuery(api.invoices.list, [])
    fakeConvex.setQuery(api.templates.list, [templateDoc()])
    fakeConvex.setQuery(api.clients.list, [])
    fakeConvex.setQuery(api.profiles.get, null)
    const { user } = await renderApp('/')
    expect(screen.queryByText('Start with your template')).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /New invoice/ }).at(-1)!)
    expect(await screen.findByRole('dialog', { name: 'New invoice' })).toBeInTheDocument()
  })

  it('records a payment from the row menu', async () => {
    withData()
    const { user } = await renderApp('/')
    await user.click(within(table()).getByRole('button', { name: 'Actions for 2026032' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Mark as paid' }))

    const dialog = await screen.findByRole('dialog', { name: 'Mark 2026032 as paid' })
    expect(within(dialog).getByLabelText('Payment date')).toHaveValue('2026-10-15')
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Bank transfer')
    await user.click(within(dialog).getByRole('button', { name: 'Mark as paid' }))

    expect(fakeConvex.handler(api.invoices.setStatus)).toHaveBeenCalledWith({
      id: 'inv2',
      status: 'paid',
      paidAt: '2026-10-15',
      paidNote: 'Bank transfer',
    })
  })

  it('copies an invoice for next month', async () => {
    withData()
    fakeConvex.handler(api.invoices.duplicate).mockResolvedValue('copy1')
    const { user, router } = await renderApp('/')
    await user.click(within(table()).getByRole('button', { name: 'Actions for 2026031' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Duplicate for next month' }))
    expect(fakeConvex.handler(api.invoices.duplicate)).toHaveBeenCalledWith({
      id: 'inv1',
      today: '2026-10-15',
      nextMonth: true,
    })
    await waitFor(() => {
      expect(currentPath(router)).toBe('/invoices/copy1')
    })
  })

  it('deletes with a chance to undo', async () => {
    withData()
    const { user } = await renderApp('/')
    await user.click(within(table()).getByRole('button', { name: 'Actions for 2026033' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    expect(within(table()).queryByRole('link', { name: '2026033' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(within(table()).getByRole('link', { name: '2026033' })).toBeInTheDocument()
    expect(fakeConvex.handler(api.invoices.remove)).not.toHaveBeenCalled()
  })
})
