import { api } from '@convex/_generated/api'
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { renderApp, screen } from '@/testing/render-app'

const acme = {
  _id: 'c1',
  _creationTime: 0,
  userId: 'user1',
  name: 'Acme Sdn Bhd',
  address: 'Jalan Ampang',
  attention: 'Finance',
  email: 'ap@acme.example',
  notes: 'Vendor code: 42',
}

async function open() {
  fakeConvex.setQuery(api.clients.list, [acme])
  fakeConvex.setQuery(api.invoices.list, [])
  const app = await renderApp('/clients')
  await app.user.click(screen.getByRole('button', { name: 'Actions for Acme Sdn Bhd' }))
  return app
}

describe('editing clients', () => {
  it('edits a client with their current details filled in', async () => {
    const { user } = await open()
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit client' })
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Acme Sdn Bhd')
    await user.clear(within(dialog).getByLabelText('Attention (optional)'))
    await user.type(within(dialog).getByLabelText('Attention (optional)'), 'Accounts')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(fakeConvex.handler(api.clients.update)).toHaveBeenCalledWith({
      id: 'c1',
      name: 'Acme Sdn Bhd',
      address: 'Jalan Ampang',
      attention: 'Accounts',
      email: 'ap@acme.example',
      notes: 'Vendor code: 42',
    })
  })

  it('deletes a client after confirming', async () => {
    const { user } = await open()
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete Acme Sdn Bhd?' })
    expect(within(dialog).getByText('Their invoices stay as they are.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete client' }))
    expect(fakeConvex.handler(api.clients.remove)).toHaveBeenCalledWith({ id: 'c1' })
  })
})
