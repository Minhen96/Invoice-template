import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { signedInUser, setupBackend, TODAY } from './test.helpers'

type Invoice = Doc<'invoices'>

function contentOf(invoice: Invoice) {
  const { _id, _creationTime, userId, status, paidAt, paidNote, totalSen, ...content } = invoice
  return content
}

async function setup() {
  const t = setupBackend()
  const owner = await signedInUser(t)
  const create = () => owner.as.mutation(api.invoices.create, { today: TODAY })
  const load = async (id: Invoice['_id']) => {
    const invoice = await owner.as.query(api.invoices.get, { id })
    if (!invoice) throw new Error('missing invoice')
    return invoice
  }
  return { t, owner, create, load }
}

describe('invoices.create', () => {
  it('fills a new invoice from profile defaults', async () => {
    const { create, load } = await setup()
    const invoice = await load(await create())
    expect(invoice).toMatchObject({
      number: '2026001',
      title: 'INVOICE',
      template: 'blush',
      currency: 'RM',
      issueDate: TODAY,
      dueDate: '2026-11-14',
      status: 'unpaid',
      totalSen: 0,
    })
    expect(invoice.items).toHaveLength(1)
  })

  it('gives each new invoice the next free number', async () => {
    const { create, load } = await setup()
    const numbers = []
    for (let i = 0; i < 3; i++) numbers.push((await load(await create())).number)
    expect(numbers).toEqual(['2026001', '2026002', '2026003'])
  })

  it('skips numbers already used (e.g. typed in by hand)', async () => {
    const { owner, create, load } = await setup()
    const first = await load(await create())
    await owner.as.mutation(api.invoices.update, {
      id: first._id,
      content: { ...contentOf(first), number: '2026002' },
    })
    expect((await load(await create())).number).toBe('2026003')
  })

  it('copies a saved client and their notes', async () => {
    const { owner, load } = await setup()
    const clientId = await owner.as.mutation(api.clients.create, {
      name: 'Astro Radio Sdn Bhd',
      address: 'Bukit Jalil\n57000 Kuala Lumpur',
      attention: 'Accounts Payable Department',
      email: '',
      notes: 'Vendor code: 1029934',
    })
    const id = await owner.as.mutation(api.invoices.create, { today: TODAY, clientId })
    const invoice = await load(id)
    expect(invoice.billTo.name).toBe('Astro Radio Sdn Bhd')
    expect(invoice.notes).toBe('Vendor code: 1029934')
    expect(invoice.clientId).toBe(clientId)
  })

  it('rejects a malformed "today"', async () => {
    const { owner } = await setup()
    await expect(owner.as.mutation(api.invoices.create, { today: '15/10/2026' })).rejects.toThrow()
  })
})

describe('invoices.update', () => {
  it('saves content and recomputes the stored total', async () => {
    const { owner, create, load } = await setup()
    const invoice = await load(await create())
    await owner.as.mutation(api.invoices.update, {
      id: invoice._id,
      content: {
        ...contentOf(invoice),
        items: [
          { id: 'a', description: 'FULL TIME ANNOUNCER OCT 2026', rateSen: 25000, quantity: 20 },
        ],
        taxRateBps: 800,
      },
    })
    const saved = await load(invoice._id)
    expect(saved.items[0]?.description).toBe('FULL TIME ANNOUNCER OCT 2026')
    expect(saved.totalSen).toBe(540000)
  })

  it('refuses a number another invoice already has', async () => {
    const { owner, create, load } = await setup()
    await create()
    const second = await load(await create())
    await expect(
      owner.as.mutation(api.invoices.update, {
        id: second._id,
        content: { ...contentOf(second), number: '2026001' },
      }),
    ).rejects.toThrow(/number_taken/)
  })

  it.each([
    ['negative rate', { items: [{ id: 'a', description: '', rateSen: -1, quantity: 1 }] }],
    ['fractional sen', { items: [{ id: 'a', description: '', rateSen: 1.5, quantity: 1 }] }],
    ['tax above 100%', { taxRateBps: 10_001 }],
    ['bad due date', { dueDate: '31/12/2026' }],
    ['bad accent', { accent: 'red' }],
    ['empty number', { number: '   ' }],
    ['huge notes', { notes: 'x'.repeat(2001) }],
  ])('rejects %s', async (_, patch) => {
    const { owner, create, load } = await setup()
    const invoice = await load(await create())
    await expect(
      owner.as.mutation(api.invoices.update, {
        id: invoice._id,
        content: { ...contentOf(invoice), ...patch },
      }),
    ).rejects.toThrow(/invalid/)
  })
})

describe('invoices.setStatus', () => {
  it('records the payment and can undo it', async () => {
    const { owner, create, load } = await setup()
    const id = await create()
    await owner.as.mutation(api.invoices.setStatus, {
      id,
      status: 'paid',
      paidAt: '2026-10-20',
      paidNote: ' Bank transfer ',
    })
    expect(await load(id)).toMatchObject({
      status: 'paid',
      paidAt: '2026-10-20',
      paidNote: 'Bank transfer',
    })

    await owner.as.mutation(api.invoices.setStatus, { id, status: 'unpaid' })
    expect(await load(id)).toMatchObject({ status: 'unpaid', paidAt: '', showPaidStamp: false })
  })

  it('needs a valid payment date', async () => {
    const { owner, create } = await setup()
    const id = await create()
    await expect(
      owner.as.mutation(api.invoices.setStatus, { id, status: 'paid', paidAt: '' }),
    ).rejects.toThrow(/invalid/)
  })
})

describe('invoices.duplicate', () => {
  async function paidOctoberInvoice() {
    const ctx = await setup()
    const invoice = await ctx.load(await ctx.create())
    await ctx.owner.as.mutation(api.invoices.update, {
      id: invoice._id,
      content: {
        ...contentOf(invoice),
        issueDate: '2026-10-07',
        dueDate: '2026-10-21',
        items: [
          {
            id: 'a',
            description: 'FULL TIME ANNOUNCER OCT 2026\n(20 days)',
            rateSen: 25000,
            quantity: 20,
          },
        ],
        showPaidStamp: true,
      },
    })
    await ctx.owner.as.mutation(api.invoices.setStatus, {
      id: invoice._id,
      status: 'paid',
      paidAt: '2026-10-25',
    })
    return { ...ctx, sourceId: invoice._id }
  }

  it('next month: moves dates and months, new number, unpaid', async () => {
    const { owner, load, sourceId } = await paidOctoberInvoice()
    const id = await owner.as.mutation(api.invoices.duplicate, {
      id: sourceId,
      today: TODAY,
      nextMonth: true,
    })
    const copy = await load(id)
    expect(copy).toMatchObject({
      number: '2026002',
      issueDate: '2026-11-07',
      dueDate: '2026-11-21',
      status: 'unpaid',
      paidAt: '',
      showPaidStamp: false,
      totalSen: 500000,
    })
    expect(copy.items[0]?.description).toBe('FULL TIME ANNOUNCER NOV 2026\n(20 days)')
    expect(copy.items[0]?.id).not.toBe('a')
  })

  it('plain copy: dated today with the same payment terms', async () => {
    const { owner, load, sourceId } = await paidOctoberInvoice()
    const id = await owner.as.mutation(api.invoices.duplicate, {
      id: sourceId,
      today: TODAY,
      nextMonth: false,
    })
    const copy = await load(id)
    expect(copy.issueDate).toBe(TODAY)
    expect(copy.dueDate).toBe('2026-10-29') // 14 days, like the source
    expect(copy.items[0]?.description).toContain('OCT 2026')
  })
})

describe('invoices.list', () => {
  it('lists newest first with light rows', async () => {
    const { owner, create, load } = await setup()
    const older = await load(await create())
    await owner.as.mutation(api.invoices.update, {
      id: older._id,
      content: { ...contentOf(older), issueDate: '2026-01-01', dueDate: '' },
    })
    await create()
    const rows = await owner.as.query(api.invoices.list, {})
    expect(rows.map((r) => r.issueDate)).toEqual([TODAY, '2026-01-01'])
    expect(rows[0]).not.toHaveProperty('items')
  })
})

describe('invoices.get', () => {
  it('returns null for a mangled id from the URL', async () => {
    const { owner } = await setup()
    expect(await owner.as.query(api.invoices.get, { id: 'not-an-id' })).toBeNull()
  })
})

describe('invoices.remove', () => {
  it('deletes the invoice', async () => {
    const { owner, create } = await setup()
    const id = await create()
    await owner.as.mutation(api.invoices.remove, { id })
    expect(await owner.as.query(api.invoices.get, { id })).toBeNull()
  })
})
