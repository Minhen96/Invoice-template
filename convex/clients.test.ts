import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import { signedInUser, setupBackend, TODAY } from './test.helpers'

const astro = {
  name: '  Astro Radio Sdn Bhd ',
  address: 'All Asia Broadcast Centre\nBukit Jalil',
  attention: 'Accounts Payable Department',
  email: 'ap@example.com',
  notes: 'Station name: GOXUAN',
}

describe('clients', () => {
  it('creates, lists A→Z and updates', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const id = await as.mutation(api.clients.create, astro)
    await as.mutation(api.clients.create, { ...astro, name: 'Acme' })

    const list = await as.query(api.clients.list, {})
    expect(list.map((c) => c.name)).toEqual(['Acme', 'Astro Radio Sdn Bhd'])

    await as.mutation(api.clients.update, { id, ...astro, attention: 'Finance' })
    const updated = (await as.query(api.clients.list, {})).find((c) => c._id === id)
    expect(updated?.attention).toBe('Finance')
  })

  it.each([
    ['a blank name', { name: '   ' }],
    ['a bad email', { email: 'not-an-email' }],
  ])('rejects %s', async (_, patch) => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    await expect(as.mutation(api.clients.create, { ...astro, ...patch })).rejects.toThrow(/invalid/)
  })

  it('deleting a client keeps its invoices, just unlinked', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const clientId = await as.mutation(api.clients.create, astro)
    const invoiceId = await as.mutation(api.invoices.create, { today: TODAY, clientId })

    await as.mutation(api.clients.remove, { id: clientId })

    const invoice = await as.query(api.invoices.get, { id: invoiceId })
    expect(invoice?.clientId).toBeUndefined()
    expect(invoice?.billTo.name).toBe('Astro Radio Sdn Bhd')
  })
})
