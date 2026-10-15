import { api } from '@convex/_generated/api'
import { waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { listRow, profileResult } from '@/testing/fixtures'
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
  listRow({ _id: 'inv2' as never, number: '2026032', dueDate: '2026-10-01', totalSen: 50000 }),
  listRow({ _id: 'inv1' as never, number: '2026031', status: 'paid', paidAt: '2026-10-05' }),
]

function withData() {
  fakeConvex.setQuery(api.invoices.list, rows)
  fakeConvex.setQuery(api.profiles.get, profileResult())
}

function table() {
  return screen.getAllByRole('table')[0]!
}

describe('invoices dashboard', () => {
  it('shows skeletons while loading', async () => {
    await renderApp('/')
    expect(screen.getByRole('status', { name: 'Loading invoices' })).toBeInTheDocument()
  })

  it('sums what is outstanding, overdue and paid this year', async () => {
    withData()
    await renderApp('/')
    const summary = screen.getByRole('region', { name: 'Summary' })
    expect(within(summary).getByText('RM 1,700.00')).toBeInTheDocument() // outstanding
    expect(within(summary).getByText('RM 500.00')).toBeInTheDocument() // overdue
    expect(within(summary).getByText('RM 5,000.00')).toBeInTheDocument() // paid in 2026
    expect(within(summary).getByText('RM 6,700.00')).toBeInTheDocument() // invoiced in 2026
    expect(within(summary).getByText('1 past due')).toBeInTheDocument()
  })

  it('lists invoices with their status', async () => {
    withData()
    await renderApp('/')
    const body = within(table())
    expect(body.getByRole('link', { name: '2026033' })).toHaveAttribute('href', '/invoices/inv3')
    expect(body.getByText('Overdue')).toBeInTheDocument()
    expect(body.getByText('Paid')).toBeInTheDocument()
    await expectNoA11yViolations()
  })

  it('filters by status tab and keeps the filter in the URL', async () => {
    withData()
    const { user, router } = await renderApp('/')
    await user.click(screen.getByRole('tab', { name: /Overdue/ }))
    expect(router.state.location.search).toMatchObject({ status: 'overdue' })
    const links = within(table()).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['2026032'])
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

  it('says so when nothing matches', async () => {
    withData()
    await renderApp('/?q=zzz')
    expect(screen.getByText('No invoices match.')).toBeInTheDocument()
  })

  it('invites you to create the first invoice', async () => {
    fakeConvex.setQuery(api.invoices.list, [])
    fakeConvex.setQuery(api.profiles.get, null)
    fakeConvex.handler(api.invoices.create).mockResolvedValue('new1')
    const { user, router } = await renderApp('/')
    expect(screen.getByText('No invoices yet.')).toBeInTheDocument()
    expect(screen.getByText('Add your details once')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /New invoice/ }).at(-1)!)
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith({ today: '2026-10-15' })
    await waitFor(() => {
      expect(currentPath(router)).toBe('/invoices/new1')
    })
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
