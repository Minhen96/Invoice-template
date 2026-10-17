import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { itemKey } from './lib/itemKey'
import type { LineItem } from './lib/validators'
import { createTemplate, signedInUser, setupBackend, TODAY } from './test.helpers'

async function setup() {
  const t = setupBackend()
  const { as } = await signedInUser(t)
  const templateId = await createTemplate(as)
  async function invoiceWith(items: Omit<LineItem, 'id' | 'extra'>[]): Promise<Id<'invoices'>> {
    const id = await as.mutation(api.invoices.create, { today: TODAY, templateId })
    const invoice = await as.query(api.invoices.get, { id })
    if (!invoice) throw new Error('missing')
    const {
      _id,
      _creationTime,
      userId,
      status,
      paidAt,
      paidNote,
      totalSen,
      templateId: _t,
      logoId,
      logoUrl,
      ...content
    } = invoice
    await as.mutation(api.invoices.update, {
      id,
      content: {
        ...content,
        items: items.map((item, i) => ({ id: String(i), extra: {}, ...item })),
      },
    })
    return id
  }
  return { t, as, invoiceWith }
}

describe('remembered items', () => {
  it('are remembered from an invoice, skipping blank rows', async () => {
    const { as, invoiceWith } = await setup()
    const invoiceId = await invoiceWith([
      { description: 'FULL TIME ANNOUNCER\n(20 days)', rateSen: 25000, quantity: 20 },
      { description: '   ', rateSen: 0, quantity: 1 },
    ])
    await as.mutation(api.items.rememberFromInvoice, { invoiceId })
    expect(await as.query(api.items.list, {})).toEqual([
      expect.objectContaining({
        description: 'FULL TIME ANNOUNCER\n(20 days)',
        rateSen: 25000,
        quantity: 20,
        useCount: 1,
      }),
    ])
  })

  it('keep one row per description with the latest price, counting each invoice once', async () => {
    const { as, invoiceWith } = await setup()
    const first = await invoiceWith([{ description: 'Voice-over', rateSen: 10000, quantity: 1 }])
    await as.mutation(api.items.rememberFromInvoice, { invoiceId: first })
    await as.mutation(api.items.rememberFromInvoice, { invoiceId: first })
    const second = await invoiceWith([
      { description: '  voice-OVER ', rateSen: 12000, quantity: 2 },
    ])
    await as.mutation(api.items.rememberFromInvoice, { invoiceId: second })

    const items = await as.query(api.items.list, {})
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ description: 'voice-OVER', rateSen: 12000, useCount: 2 })
  })

  it('can be added by hand, refusing a blank or repeated description', async () => {
    const { as, invoiceWith } = await setup()
    const id = await as.mutation(api.items.create, { description: '  Voice-over ', rateSen: 9000 })
    expect(await as.query(api.items.list, {})).toMatchObject([
      { _id: id, description: 'Voice-over', rateSen: 9000, quantity: 1, useCount: 0 },
    ])
    await expect(
      as.mutation(api.items.create, { description: 'VOICE-OVER', rateSen: 1 }),
    ).rejects.toThrow(/duplicate/)
    await expect(as.mutation(api.items.create, { description: ' ', rateSen: 1 })).rejects.toThrow(
      /invalid/,
    )
    await expect(
      as.mutation(api.items.create, { description: 'Mixing', rateSen: -1 }),
    ).rejects.toThrow(/invalid/)

    // Using it on an invoice later counts as its first use.
    const invoiceId = await invoiceWith([{ description: 'Voice-over', rateSen: 9500, quantity: 2 }])
    await as.mutation(api.items.rememberFromInvoice, { invoiceId })
    expect(await as.query(api.items.list, {})).toMatchObject([
      { _id: id, rateSen: 9500, useCount: 1 },
    ])
  })

  it('can be edited and deleted', async () => {
    const { as, invoiceWith } = await setup()
    const invoiceId = await invoiceWith([
      { description: 'Editing', rateSen: 5000, quantity: 1 },
      { description: 'Mixing', rateSen: 7000, quantity: 1 },
    ])
    await as.mutation(api.items.rememberFromInvoice, { invoiceId })
    const list = await as.query(api.items.list, {})
    const find = (description: string) => {
      const item = list.find((i) => i.description === description)
      if (!item) throw new Error(`missing ${description}`)
      return item
    }
    const editing = find('Editing')
    const mixing = find('Mixing')

    await as.mutation(api.items.update, {
      id: editing._id,
      description: 'Video editing',
      rateSen: 6000,
    })
    await expect(
      as.mutation(api.items.update, { id: editing._id, description: 'mixing', rateSen: 1 }),
    ).rejects.toThrow(/duplicate/)
    await expect(
      as.mutation(api.items.update, { id: editing._id, description: ' ', rateSen: 1 }),
    ).rejects.toThrow(/invalid/)

    await as.mutation(api.items.remove, { id: mixing._id })
    expect((await as.query(api.items.list, {})).map((i) => [i.description, i.rateSen])).toEqual([
      ['Video editing', 6000],
    ])
  })
})

describe('itemKey', () => {
  it('ignores case and spacing', () => {
    expect(itemKey('  Full  time\nAnnouncer ')).toBe('full time announcer')
  })
})
