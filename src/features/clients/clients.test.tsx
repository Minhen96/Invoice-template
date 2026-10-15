import { api } from '@convex/_generated/api'
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { listRow } from '@/testing/fixtures'
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
    expect(fakeConvex.handler(api.clients.create)).toHaveBeenCalledWith({
      name: 'Astro Radio Sdn Bhd',
      address: '',
      attention: '',
      email: '',
      notes: '',
    })
  })

  it('starts an invoice for a client', async () => {
    fakeConvex.setQuery(api.clients.list, [acme])
    fakeConvex.setQuery(api.invoices.list, [])
    fakeConvex.handler(api.invoices.create).mockResolvedValue('new1')
    const { user } = await renderApp('/clients')
    await user.click(screen.getByRole('button', { name: 'Invoice' }))
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith({
      today: '2026-10-15',
      clientId: 'c1',
    })
  })
})
