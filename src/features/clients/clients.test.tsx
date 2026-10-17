import { api } from '@convex/_generated/api'
import { waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { listRow, templateDoc } from '@/testing/fixtures'
import { expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

const acme = {
  _id: 'c1',
  _creationTime: 0,
  userId: 'user1',
  name: 'Acme Sdn Bhd',
  address: 'Jalan Ampang',
  attention: 'Finance',
  email: '',
  notes: '',
}

describe('clients', () => {
  it('shows an empty state', async () => {
    fakeConvex.setQuery(api.clients.list, [])
    fakeConvex.setQuery(api.invoices.list, [])
    await renderApp('/clients')
    expect(screen.getByText('No clients yet.')).toBeInTheDocument()
  })

  it("shows each client's unpaid total", async () => {
    fakeConvex.setQuery(api.clients.list, [acme])
    fakeConvex.setQuery(api.invoices.list, [
      listRow({ _id: 'i1' as never, clientId: 'c1' as never, totalSen: 30000 }),
      listRow({ _id: 'i2' as never, clientId: 'c1' as never, totalSen: 20000, status: 'paid' }),
    ])
    await renderApp('/clients')
    expect(screen.getByText('2 invoices')).toBeInTheDocument()
    expect(screen.getByText('RM 300.00 unpaid')).toBeInTheDocument()
    await expectNoA11yViolations()
  })

  it('searches clients by name, address or email', async () => {
    fakeConvex.setQuery(api.clients.list, [
      acme,
      { ...acme, _id: 'c2', name: 'Astro Radio', address: 'Bukit Jalil', attention: '' },
    ])
    fakeConvex.setQuery(api.invoices.list, [])
    const { user } = await renderApp('/clients')
    const search = screen.getByRole('searchbox', { name: 'Search clients' })
    await user.type(search, 'jalil')
    expect(screen.getByRole('heading', { name: 'Astro Radio' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Acme Sdn Bhd' })).not.toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'zzz')
    expect(screen.getByText('No clients match.')).toBeInTheDocument()
  })

  it('adds a client, checking the details first', async () => {
    fakeConvex.setQuery(api.clients.list, [])
    fakeConvex.setQuery(api.invoices.list, [])
    const { user } = await renderApp('/clients')
    await user.click(screen.getAllByRole('button', { name: 'Add client' })[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'New client' })

    await user.type(within(dialog).getByLabelText('Email (optional)'), 'not-an-email')
    await user.click(within(dialog).getByRole('button', { name: 'Add client' }))
    expect(await within(dialog).findByText('Enter the client’s name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(fakeConvex.handler(api.clients.create)).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText('Name'), 'Astro Radio Sdn Bhd')
    await user.clear(within(dialog).getByLabelText('Email (optional)'))
    await user.click(within(dialog).getByRole('button', { name: 'Add client' }))
    // The form checks the details first (asynchronously), then saves.
    await waitFor(() => {
      expect(fakeConvex.handler(api.clients.create)).toHaveBeenCalledWith({
        name: 'Astro Radio Sdn Bhd',
        address: '',
        attention: '',
        email: '',
        notes: '',
      })
    })
  })

  it('starts an invoice for a client', async () => {
    fakeConvex.setQuery(api.clients.list, [acme])
    fakeConvex.setQuery(api.invoices.list, [])
    fakeConvex.setQuery(api.templates.list, [templateDoc()])
    fakeConvex.setQuery(api.profiles.get, null)
    fakeConvex.setQuery(api.businesses.list, [])
    fakeConvex.setQuery(api.bankAccounts.list, [])
    fakeConvex.handler(api.invoices.create).mockResolvedValue('new1')
    const { user } = await renderApp('/clients')
    await user.click(screen.getByRole('button', { name: 'Invoice' }))
    const dialog = await screen.findByRole('dialog', { name: 'New invoice' })
    expect(within(dialog).getByLabelText('Client')).toHaveValue('c1')
    await user.click(within(dialog).getByRole('button', { name: 'Create invoice' }))
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith({
      today: '2026-10-15',
      templateId: 'tpl1',
      clientId: 'c1',
      issueDate: '2026-10-15',
      dueDate: '',
      items: [],
      discountSen: 0,
      taxRateBps: 0,
      taxLabel: 'SST',
      notes: '',
    })
  })
})
