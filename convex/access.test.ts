import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { createTemplate, signedInUser, setupBackend, TODAY } from './test.helpers'

function contentOf(invoice: Doc<'invoices'> & { logoUrl?: string | null }) {
  const {
    _id,
    _creationTime,
    userId,
    status,
    paidAt,
    paidNote,
    totalSen,
    templateId,
    logoId,
    logoUrl,
    ...content
  } = invoice
  return content
}

/**
 * The most important guarantee: one account can never see or change another account's data,
 * and nothing works signed out. Every table and function belongs here.
 */
describe('account isolation', () => {
  async function twoAccounts() {
    const t = setupBackend()
    const alice = await signedInUser(t, 'alice@example.com')
    const bob = await signedInUser(t, 'bob@example.com')
    const bankAccountId = await alice.as.mutation(api.bankAccounts.create, {
      accountName: 'Alice',
      idLabel: 'IC No',
      idNumber: '000000-00-0000',
      bankName: 'Bank',
      accountNumber: '123',
      extra: '',
    })
    const businessId = await alice.as.mutation(api.businesses.create, {
      name: 'Alice Studio',
      regNo: '',
      address: '',
      email: '',
      phone: '',
    })
    const templateId = await createTemplate(alice.as, { name: 'Alice template' })
    const invoiceId = await alice.as.mutation(api.invoices.create, { today: TODAY, templateId })
    const invoice = await alice.as.query(api.invoices.get, { id: invoiceId })
    if (!invoice) throw new Error('missing')
    await alice.as.mutation(api.invoices.update, {
      id: invoiceId,
      content: {
        ...contentOf(invoice),
        items: [{ id: 'a', description: 'Secret work', rateSen: 100, quantity: 1, extra: {} }],
      },
    })
    await alice.as.mutation(api.items.rememberFromInvoice, { invoiceId })
    const [item] = await alice.as.query(api.items.list, {})
    if (!item) throw new Error('missing item')
    const clientId = await alice.as.mutation(api.clients.create, {
      name: 'Alice client',
      address: '',
      attention: '',
      email: '',
      notes: '',
    })
    const bobTemplateId = await createTemplate(bob.as)
    return {
      t,
      alice,
      bob,
      invoiceId,
      clientId,
      templateId,
      itemId: item._id,
      bobTemplateId,
      businessId,
      bankAccountId,
    }
  }

  it("lists show only the caller's rows", async () => {
    const { bob } = await twoAccounts()
    expect(await bob.as.query(api.invoices.list, {})).toEqual([])
    expect(await bob.as.query(api.clients.list, {})).toEqual([])
    expect(await bob.as.query(api.items.list, {})).toEqual([])
    expect((await bob.as.query(api.templates.list, {})).map((t) => t.name)).toEqual(['My template'])
    expect(await bob.as.query(api.profiles.get, {})).toBeNull()
    const [bobInvoice] = await Promise.all([
      bob.as.mutation(api.invoices.create, {
        today: TODAY,
        templateId: (await bob.as.query(api.templates.list, {}))[0]!._id,
      }),
    ])
    const created = await bob.as.query(api.invoices.get, { id: bobInvoice })
    expect(created?.payment.accountName).toBe('')
  })

  it("another account's invoice and template look like they don't exist", async () => {
    const { bob, invoiceId, templateId } = await twoAccounts()
    expect(await bob.as.query(api.invoices.get, { id: invoiceId })).toBeNull()
    expect(await bob.as.query(api.templates.get, { id: templateId })).toBeNull()
  })

  it("another account's invoice can't be changed, copied, deleted or remembered", async () => {
    const { alice, bob, invoiceId, bobTemplateId } = await twoAccounts()
    const original = await alice.as.query(api.invoices.get, { id: invoiceId })
    if (!original) throw new Error('missing')
    const content = contentOf(original)

    const attempts = [
      bob.as.mutation(api.invoices.update, { id: invoiceId, content }),
      bob.as.mutation(api.invoices.setStatus, { id: invoiceId, status: 'paid', paidAt: TODAY }),
      bob.as.mutation(api.invoices.duplicate, { id: invoiceId, today: TODAY, nextMonth: false }),
      bob.as.mutation(api.invoices.update, { id: invoiceId, content, templateId: bobTemplateId }),
      bob.as.mutation(api.invoices.remove, { id: invoiceId }),
      bob.as.mutation(api.items.rememberFromInvoice, { invoiceId }),
    ]
    for (const attempt of attempts) await expect(attempt).rejects.toThrow(/not_found/)
    expect(await alice.as.query(api.invoices.get, { id: invoiceId })).toMatchObject({
      status: 'unpaid',
    })
  })

  it("another account's template can't be used, changed, copied or deleted", async () => {
    const { bob, templateId, invoiceId } = await twoAccounts()
    const bobInvoiceId = await bob.as.mutation(api.invoices.create, {
      today: TODAY,
      templateId: (await bob.as.query(api.templates.list, {}))[0]!._id,
    })
    const attempts = [
      bob.as.mutation(api.invoices.create, { today: TODAY, templateId }),
      bob.as.mutation(api.invoices.update, {
        id: bobInvoiceId,
        content: contentOf((await bob.as.query(api.invoices.get, { id: bobInvoiceId }))!),
        templateId,
      }),
      bob.as.mutation(api.templates.duplicate, { id: templateId }),
      bob.as.mutation(api.templates.remove, { id: templateId }),
      bob.as.mutation(api.templates.removeLogo, { id: templateId }),
    ]
    for (const attempt of attempts) await expect(attempt).rejects.toThrow(/not_found/)
    expect(invoiceId).toBeDefined()
  })

  it("another account's businesses and bank accounts can't be seen, used or changed", async () => {
    const { bob, businessId, bankAccountId, bobTemplateId } = await twoAccounts()
    expect(await bob.as.query(api.businesses.list, {})).toEqual([])
    expect(await bob.as.query(api.bankAccounts.list, {})).toEqual([])
    const bobTemplate = await bob.as.query(api.templates.get, { id: bobTemplateId })
    if (!bobTemplate) throw new Error('missing')
    const { _id, _creationTime, userId, logoId, logoUrl, ...fields } = bobTemplate
    const attempts = [
      bob.as.mutation(api.businesses.update, {
        id: businessId,
        name: 'x',
        regNo: '',
        address: '',
        email: '',
        phone: '',
      }),
      bob.as.mutation(api.businesses.setDefault, { id: businessId }),
      bob.as.mutation(api.businesses.remove, { id: businessId }),
      bob.as.mutation(api.bankAccounts.setDefault, { id: bankAccountId }),
      bob.as.mutation(api.bankAccounts.remove, { id: bankAccountId }),
      bob.as.mutation(api.templates.update, { id: bobTemplateId, ...fields, businessId }),
      bob.as.mutation(api.templates.update, { id: bobTemplateId, ...fields, bankAccountId }),
      bob.as.mutation(api.templates.create, { businessId }),
      bob.as.mutation(api.templates.create, { bankAccountId }),
      bob.as.mutation(api.invoices.create, { today: TODAY, templateId: bobTemplateId, businessId }),
      bob.as.mutation(api.invoices.create, {
        today: TODAY,
        templateId: bobTemplateId,
        bankAccountId,
      }),
    ]
    for (const attempt of attempts) await expect(attempt).rejects.toThrow(/not_found/)
  })

  it("deleting an account can't reach another account", async () => {
    const { alice, bob } = await twoAccounts()
    await expect(
      bob.as.mutation(api.account.deleteAccount, { confirmEmail: 'alice@example.com' }),
    ).rejects.toThrow(/invalid/)
    expect(await alice.as.query(api.invoices.list, {})).toHaveLength(1)
    await bob.as.mutation(api.account.deleteAccount, { confirmEmail: 'bob@example.com' })
    expect(await alice.as.query(api.invoices.list, {})).toHaveLength(1)
    expect(await alice.as.query(api.account.viewer, {})).toMatchObject({
      email: 'alice@example.com',
    })
  })

  it("another account's item can't be changed or deleted", async () => {
    const { bob, itemId } = await twoAccounts()
    await expect(
      bob.as.mutation(api.items.update, { id: itemId, description: 'x', rateSen: 1 }),
    ).rejects.toThrow(/not_found/)
    await expect(bob.as.mutation(api.items.remove, { id: itemId })).rejects.toThrow(/not_found/)
  })

  it("another account's client can't be used, changed or deleted", async () => {
    const { bob, clientId, bobTemplateId } = await twoAccounts()
    await expect(
      bob.as.mutation(api.invoices.create, { today: TODAY, templateId: bobTemplateId, clientId }),
    ).rejects.toThrow(/not_found/)
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
    const { bob, clientId, bobTemplateId } = await twoAccounts()
    const bobInvoiceId = await bob.as.mutation(api.invoices.create, {
      today: TODAY,
      templateId: bobTemplateId,
    })
    const bobInvoice = await bob.as.query(api.invoices.get, { id: bobInvoiceId })
    if (!bobInvoice) throw new Error('missing')
    await expect(
      bob.as.mutation(api.invoices.update, {
        id: bobInvoiceId,
        content: { ...contentOf(bobInvoice), clientId },
      }),
    ).rejects.toThrow(/not_found/)
  })

  it('everything is refused when signed out', async () => {
    const { t, invoiceId, templateId } = await twoAccounts()
    await expect(t.query(api.invoices.list, {})).rejects.toThrow(/unauthorized/)
    await expect(t.query(api.invoices.get, { id: invoiceId })).rejects.toThrow(/unauthorized/)
    await expect(t.mutation(api.invoices.create, { today: TODAY, templateId })).rejects.toThrow(
      /unauthorized/,
    )
    await expect(t.query(api.clients.list, {})).rejects.toThrow(/unauthorized/)
    await expect(t.query(api.templates.list, {})).rejects.toThrow(/unauthorized/)
    await expect(t.mutation(api.templates.create, {})).rejects.toThrow(/unauthorized/)
    await expect(t.query(api.items.list, {})).rejects.toThrow(/unauthorized/)
    await expect(t.mutation(api.items.create, { description: 'x', rateSen: 1 })).rejects.toThrow(
      /unauthorized/,
    )
    await expect(t.query(api.businesses.list, {})).rejects.toThrow(/unauthorized/)
    await expect(t.query(api.bankAccounts.list, {})).rejects.toThrow(/unauthorized/)
    await expect(t.query(api.profiles.get, {})).rejects.toThrow(/unauthorized/)
    await expect(
      t.mutation(api.account.deleteAccount, { confirmEmail: 'alice@example.com' }),
    ).rejects.toThrow(/unauthorized/)
    expect(await t.query(api.account.viewer, {})).toBeNull()
  })
})
