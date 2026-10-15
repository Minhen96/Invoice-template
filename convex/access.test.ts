import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import { signedInUser, setupBackend, TODAY } from './test.helpers'

/**
 * The most important guarantee: one account can never see or change another account's data,
 * and nothing works signed out.
 */
describe('account isolation', () => {
  async function twoAccounts() {
    const t = setupBackend()
    const alice = await signedInUser(t, 'alice@example.com')
    const bob = await signedInUser(t, 'bob@example.com')
    const invoiceId = await alice.as.mutation(api.invoices.create, { today: TODAY })
    const clientId = await alice.as.mutation(api.clients.create, {
      name: 'Alice client',
      address: '',
      attention: '',
      email: '',
      notes: '',
    })
    await alice.as.mutation(api.profiles.update, {
      today: TODAY,
      payment: {
        accountName: 'Alice',
        idLabel: 'IC No',
        idNumber: '000000-00-0000',
        bankName: 'Bank',
        accountNumber: '123',
        extra: '',
      },
    })
    return { t, alice, bob, invoiceId, clientId }
  }

  it("lists show only the caller's rows", async () => {
    const { bob } = await twoAccounts()
    expect(await bob.as.query(api.invoices.list, {})).toEqual([])
    expect(await bob.as.query(api.clients.list, {})).toEqual([])
    expect(await bob.as.query(api.profiles.get, {})).toBeNull()
  })

  it("another account's invoice looks like it doesn't exist", async () => {
    const { bob, invoiceId } = await twoAccounts()
    expect(await bob.as.query(api.invoices.get, { id: invoiceId })).toBeNull()
  })

  it("another account's invoice can't be changed, copied or deleted", async () => {
    const { alice, bob, invoiceId } = await twoAccounts()
    const original = await alice.as.query(api.invoices.get, { id: invoiceId })
    if (!original) throw new Error('missing')
    const { _id, _creationTime, userId, status, paidAt, paidNote, totalSen, ...content } = original

    const attempts = [
      bob.as.mutation(api.invoices.update, { id: invoiceId, content }),
      bob.as.mutation(api.invoices.setStatus, { id: invoiceId, status: 'paid', paidAt: TODAY }),
      bob.as.mutation(api.invoices.duplicate, { id: invoiceId, today: TODAY, nextMonth: false }),
      bob.as.mutation(api.invoices.remove, { id: invoiceId }),
    ]
    for (const attempt of attempts) await expect(attempt).rejects.toThrow(/not_found/)
    expect(await alice.as.query(api.invoices.get, { id: invoiceId })).toMatchObject({
      status: 'unpaid',
    })
  })

  it("another account's client can't be used, changed or deleted", async () => {
    const { bob, clientId } = await twoAccounts()
    await expect(bob.as.mutation(api.invoices.create, { today: TODAY, clientId })).rejects.toThrow(
      /not_found/,
    )
    await expect(
      bob.as.mutation(api.clients.update, {
        id: clientId,
        name: 'x',
        address: '',
        attention: '',
        email: '',
        notes: '',
      }),
    ).rejects.toThrow(/not_found/)
    await expect(bob.as.mutation(api.clients.remove, { id: clientId })).rejects.toThrow(/not_found/)
  })

  it("an invoice can't be linked to another account's client", async () => {
    const { t, bob, clientId } = await twoAccounts()
    const bobInvoiceId = await bob.as.mutation(api.invoices.create, { today: TODAY })
    const bobInvoice = await bob.as.query(api.invoices.get, { id: bobInvoiceId })
    if (!bobInvoice) throw new Error('missing')
    const { _id, _creationTime, userId, status, paidAt, paidNote, totalSen, ...content } =
      bobInvoice
    await expect(
      bob.as.mutation(api.invoices.update, { id: bobInvoiceId, content: { ...content, clientId } }),
    ).rejects.toThrow(/not_found/)
    expect(t).toBeDefined()
  })

  it('everything is refused when signed out', async () => {
    const { t, invoiceId } = await twoAccounts()
    await expect(t.query(api.invoices.list, {})).rejects.toThrow(/unauthorized/)
    await expect(t.query(api.invoices.get, { id: invoiceId })).rejects.toThrow(/unauthorized/)
    await expect(t.mutation(api.invoices.create, { today: TODAY })).rejects.toThrow(/unauthorized/)
    await expect(t.query(api.clients.list, {})).rejects.toThrow(/unauthorized/)
    await expect(t.query(api.profiles.get, {})).rejects.toThrow(/unauthorized/)
    expect(await t.query(api.account.viewer, {})).toBeNull()
  })
})
