import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { DEFAULT_COLUMNS } from './lib/defaults'
import { switchTemplate } from './lib/templateSwitch'
import { createTemplate, signedInUser, setupBackend, TODAY } from './test.helpers'

type Invoice = Doc<'invoices'>

function contentOf(invoice: Invoice & { logoUrl?: string | null }) {
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

async function setup() {
  const t = setupBackend()
  const owner = await signedInUser(t)
  const templateId = await createTemplate(owner.as)
  const create = () => owner.as.mutation(api.invoices.create, { today: TODAY, templateId })
  const load = async (id: Invoice['_id']) => {
    const invoice = await owner.as.query(api.invoices.get, { id })
    if (!invoice) throw new Error('missing invoice')
    return invoice
  }
  return { t, owner, create, load, templateId }
}

describe('invoices.create', () => {
  it('fills a new invoice from the template', async () => {
    const { create, load } = await setup()
    const invoice = await load(await create())
    expect(invoice).toMatchObject({
      number: '2026001',
      title: 'INVOICE',
      layout: 'blush',
      currency: 'RM',
      issueDate: TODAY,
      dueDate: '2026-11-14',
      status: 'unpaid',
      totalSen: 0,
    })
    expect(invoice.items).toEqual([])
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
    const { owner, load, templateId } = await setup()
    const clientId = await owner.as.mutation(api.clients.create, {
      name: 'Astro Radio Sdn Bhd',
      address: 'Bukit Jalil\n57000 Kuala Lumpur',
      attention: 'Accounts Payable Department',
      email: '',
      notes: 'Vendor code: 1029934',
    })
    const id = await owner.as.mutation(api.invoices.create, { today: TODAY, templateId, clientId })
    const invoice = await load(id)
    expect(invoice.billTo.name).toBe('Astro Radio Sdn Bhd')
    expect(invoice.notes).toBe('Vendor code: 1029934')
    expect(invoice.clientId).toBe(clientId)
  })

  it('rejects a malformed "today"', async () => {
    const { owner, templateId } = await setup()
    await expect(
      owner.as.mutation(api.invoices.create, { today: '15/10/2026', templateId }),
    ).rejects.toThrow()
  })
})

describe('invoices from templates', () => {
  it('copy the template, and later template edits leave the invoice alone', async () => {
    const { owner, load } = await setup()
    const templateId = await createTemplate(owner.as, {
      layout: 'minimal',
      accent: '#1d4ed8',
      title: 'QUOTATION',
      dueDays: null,
      notes: 'Thank you!',
      columns: { ...DEFAULT_COLUMNS, quantity: 'Hours', extra: [{ id: 'date', label: 'Date' }] },
    })
    const id = await owner.as.mutation(api.invoices.create, { today: TODAY, templateId })
    expect(await load(id)).toMatchObject({
      layout: 'minimal',
      accent: '#1d4ed8',
      title: 'QUOTATION',
      dueDate: '',
      notes: 'Thank you!',
      columns: { quantity: 'Hours', extra: [{ id: 'date', label: 'Date' }] },
      templateId,
    })

    const template = await owner.as.query(api.templates.get, { id: templateId })
    if (!template) throw new Error('missing')
    const { _id, _creationTime, userId, logoId, logoUrl, ...fields } = template
    await owner.as.mutation(api.templates.update, { id: templateId, ...fields, title: 'RECEIPT' })
    expect((await load(id)).title).toBe('QUOTATION')
  })

  it("uses the template's business and bank account, else the defaults", async () => {
    const { owner, templateId, load } = await setup()
    const biz = (name: string) => ({ name, regNo: '', address: '', email: '', phone: '' })
    const bank = (bankName: string) => ({
      accountName: 'Me',
      idLabel: 'IC No',
      idNumber: '',
      bankName,
      accountNumber: '1',
      extra: '',
    })
    const studioA = await owner.as.mutation(api.businesses.create, biz('Studio A'))
    const studioB = await owner.as.mutation(api.businesses.create, biz('Studio B'))
    await owner.as.mutation(api.bankAccounts.create, bank('Public Bank'))
    const maybank = await owner.as.mutation(api.bankAccounts.create, bank('Maybank'))

    // No choice on the template: the defaults (the first ones added).
    const first = await owner.as.mutation(api.invoices.create, { today: TODAY, templateId })
    expect(await load(first)).toMatchObject({
      from: { name: 'Studio A' },
      payment: { bankName: 'Public Bank' },
    })
    expect((await load(first)).from).not.toHaveProperty('isDefault')

    // The template picks Studio B + Maybank.
    const template = await owner.as.query(api.templates.get, { id: templateId })
    if (!template) throw new Error('missing')
    const { _id, _creationTime, userId, logoId, logoUrl, ...fields } = template
    await owner.as.mutation(api.templates.update, {
      id: templateId,
      ...fields,
      businessId: studioB,
      bankAccountId: maybank,
    })
    const second = await owner.as.mutation(api.invoices.create, { today: TODAY, templateId })
    expect(await load(second)).toMatchObject({
      from: { name: 'Studio B' },
      payment: { bankName: 'Maybank' },
    })

    // Editing a business later never changes invoices already made.
    await owner.as.mutation(api.businesses.update, { id: studioA, ...biz('Studio A2') })
    expect((await load(first)).from.name).toBe('Studio A')

    // A deleted choice falls back to the default.
    await owner.as.mutation(api.businesses.remove, { id: studioB })
    const third = await owner.as.mutation(api.invoices.create, { today: TODAY, templateId })
    expect((await load(third)).from.name).toBe('Studio A2')
  })

  it('uses the business, bank account and date picked in the New invoice popup', async () => {
    const { owner, templateId, load } = await setup()
    await owner.as.mutation(api.businesses.create, {
      name: 'Studio A',
      regNo: '',
      address: '',
      email: '',
      phone: '',
    })
    const studioB = await owner.as.mutation(api.businesses.create, {
      name: 'Studio B',
      regNo: '',
      address: '',
      email: '',
      phone: '',
    })
    const bank = (bankName: string) => ({
      accountName: 'Me',
      idLabel: 'IC No',
      idNumber: '',
      bankName,
      accountNumber: '1',
      extra: '',
    })
    await owner.as.mutation(api.bankAccounts.create, bank('Public Bank'))
    const maybank = await owner.as.mutation(api.bankAccounts.create, bank('Maybank'))
    const id = await owner.as.mutation(api.invoices.create, {
      today: TODAY,
      templateId,
      businessId: studioB,
      bankAccountId: maybank,
      issueDate: '2026-10-01',
    })
    expect(await load(id)).toMatchObject({
      from: { name: 'Studio B' },
      payment: { bankName: 'Maybank' },
      issueDate: '2026-10-01',
      // The template's 30-day terms count from the chosen date.
      dueDate: '2026-10-31',
    })
  })

  it('starts with the items, remark, discount and tax typed in the popup', async () => {
    const { owner, templateId, load } = await setup()
    const id = await owner.as.mutation(api.invoices.create, {
      today: TODAY,
      templateId,
      items: [
        {
          id: 'a',
          description: 'Announcer',
          rateSen: 25000,
          quantity: 20,
          extra: { gone: 'not a column' },
        },
      ],
      notes: 'Vendor code: 42',
      discountSen: 10000,
      taxRateBps: 800,
      taxLabel: 'SST',
    })
    const invoice = await load(id)
    expect(invoice).toMatchObject({
      items: [{ id: 'a', description: 'Announcer', rateSen: 25000, quantity: 20, extra: {} }],
      notes: 'Vendor code: 42',
      discountSen: 10000,
      taxRateBps: 800,
      // (5,000 − 100) + 8% SST
      totalSen: 529200,
    })
  })

  it('rejects impossible amounts from the popup', async () => {
    const { owner, templateId } = await setup()
    await expect(
      owner.as.mutation(api.invoices.create, { today: TODAY, templateId, discountSen: -1 }),
    ).rejects.toThrow(/invalid/)
    await expect(
      owner.as.mutation(api.invoices.create, { today: TODAY, templateId, taxRateBps: 20_000 }),
    ).rejects.toThrow(/invalid/)
  })

  it('uses the due date chosen in the popup, even none, over the template terms', async () => {
    const { owner, templateId, load } = await setup()
    const none = await owner.as.mutation(api.invoices.create, {
      today: TODAY,
      templateId,
      dueDate: '',
    })
    expect((await load(none)).dueDate).toBe('')
    const custom = await owner.as.mutation(api.invoices.create, {
      today: TODAY,
      templateId,
      dueDate: '2026-12-31',
    })
    expect((await load(custom)).dueDate).toBe('2026-12-31')
    await expect(
      owner.as.mutation(api.invoices.create, { today: TODAY, templateId, dueDate: '31/12/2026' }),
    ).rejects.toThrow(/invalid/)
  })

  it('rejects a malformed invoice date', async () => {
    const { owner, templateId } = await setup()
    await expect(
      owner.as.mutation(api.invoices.create, { today: TODAY, templateId, issueDate: '1/10/2026' }),
    ).rejects.toThrow(/invalid/)
  })

  it('works with no business or bank account yet (blank details)', async () => {
    const { create, load } = await setup()
    expect((await load(await create())).from.name).toBe('')
  })

  it('keeps items in step with the columns', async () => {
    const { owner, create, load } = await setup()
    const invoice = await load(await create())
    await owner.as.mutation(api.invoices.update, {
      id: invoice._id,
      content: {
        ...contentOf(invoice),
        columns: { ...DEFAULT_COLUMNS, showRateQty: false, extra: [{ id: 'date', label: 'Date' }] },
        items: [
          {
            id: 'a',
            description: 'Retainer',
            rateSen: 30000,
            quantity: 5,
            extra: { date: '1–31 Oct', gone: 'stale value' },
          },
        ],
      },
    })
    const saved = await load(invoice._id)
    // Rate/Quantity hidden: one amount per item. Values for missing columns are dropped.
    expect(saved.items[0]).toMatchObject({ quantity: 1, extra: { date: '1–31 Oct' } })
    expect(saved.items[0]?.extra).not.toHaveProperty('gone')
    expect(saved.totalSen).toBe(30000)
  })

  it.each([
    [
      'too many extra columns',
      { extra: [1, 2, 3, 4].map((n) => ({ id: `c${String(n)}`, label: 'x' })) },
    ],
    ['a bad column id', { extra: [{ id: 'has space', label: 'x' }] }],
    [
      'repeated column ids',
      {
        extra: [
          { id: 'a', label: 'x' },
          { id: 'a', label: 'y' },
        ],
      },
    ],
  ])('rejects %s', async (_, patch) => {
    const { owner, create, load } = await setup()
    const invoice = await load(await create())
    await expect(
      owner.as.mutation(api.invoices.update, {
        id: invoice._id,
        content: { ...contentOf(invoice), columns: { ...DEFAULT_COLUMNS, ...patch } },
      }),
    ).rejects.toThrow(/invalid/)
  })

  it('remembers the last template and client for the next "New invoice"', async () => {
    const { owner, templateId } = await setup()
    const clientId = await owner.as.mutation(api.clients.create, {
      name: 'Acme',
      address: '',
      attention: '',
      email: '',
      notes: '',
    })
    await owner.as.mutation(api.invoices.create, { today: TODAY, templateId, clientId })
    expect(await owner.as.query(api.profiles.get, {})).toMatchObject({
      lastTemplateId: templateId,
      lastClientId: clientId,
    })
  })

  it('can switch an invoice to another template, keeping client, items and notes', async () => {
    const { owner, create, load } = await setup()
    const invoice = await load(await create())
    await owner.as.mutation(api.invoices.update, {
      id: invoice._id,
      content: {
        ...contentOf(invoice),
        billTo: { name: 'Astro', address: '', attention: '' },
        items: [{ id: 'a', description: 'Hosting', rateSen: 10000, quantity: 2, extra: {} }],
        notes: 'Keep me',
      },
    })
    const other = await createTemplate(owner.as, {
      layout: 'bold',
      dueDays: 7,
      notes: 'Template note',
      columns: { ...DEFAULT_COLUMNS, amount: 'Amount' },
    })
    // The editor restyles its draft (switchTemplate), then saves it with the new template.
    const otherTemplate = await owner.as.query(api.templates.get, { id: other })
    if (!otherTemplate) throw new Error('missing')
    const edited = await load(invoice._id)
    await owner.as.mutation(api.invoices.update, {
      id: invoice._id,
      content: switchTemplate(contentOf(edited), otherTemplate),
      templateId: other,
    })
    expect(await load(invoice._id)).toMatchObject({
      layout: 'bold',
      dueDate: '2026-10-22',
      columns: { amount: 'Amount' },
      billTo: { name: 'Astro' },
      items: [{ description: 'Hosting' }],
      notes: 'Keep me',
      totalSen: 20000,
      templateId: other,
    })
  })

  it('needs a template that exists', async () => {
    const { owner, templateId } = await setup()
    await createTemplate(owner.as, { name: 'Kept' }) // the last template can't be deleted
    await owner.as.mutation(api.templates.remove, { id: templateId })
    await expect(
      owner.as.mutation(api.invoices.create, { today: TODAY, templateId }),
    ).rejects.toThrow(/not_found/)
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
          {
            id: 'a',
            description: 'FULL TIME ANNOUNCER OCT 2026',
            rateSen: 25000,
            quantity: 20,
            extra: {},
          },
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
    [
      'negative rate',
      { items: [{ id: 'a', description: '', rateSen: -1, quantity: 1, extra: {} }] },
    ],
    [
      'fractional sen',
      { items: [{ id: 'a', description: '', rateSen: 1.5, quantity: 1, extra: {} }] },
    ],
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
        name: 'Astro – Oct 2026',
        issueDate: '2026-10-07',
        dueDate: '2026-10-21',
        items: [
          {
            id: 'a',
            description: 'FULL TIME ANNOUNCER OCT 2026\n(20 days)',
            rateSen: 25000,
            quantity: 20,
            extra: {},
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
    expect(copy.name).toBe('Astro – Nov 2026')
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
    expect(copy.name).toBe('Astro – Oct 2026')
  })
})

describe('invoices.list', () => {
  it('lists newest first, whole (for the previews) with the name and client', async () => {
    const { owner, create, load, templateId } = await setup()
    const older = await load(await create())
    await owner.as.mutation(api.invoices.update, {
      id: older._id,
      content: { ...contentOf(older), issueDate: '2026-01-01', dueDate: '' },
    })
    await owner.as.mutation(api.invoices.create, {
      today: TODAY,
      templateId,
      name: '  Astro – Oct 2026 ',
    })
    const rows = await owner.as.query(api.invoices.list, {})
    expect(rows.map((r) => r.issueDate)).toEqual([TODAY, '2026-01-01'])
    expect(rows.map((r) => r.name)).toEqual(['Astro – Oct 2026', ''])
    expect(rows[0]).toMatchObject({ items: [], logoUrl: null, clientName: '' })
    expect(rows[0]).not.toHaveProperty('userId')
  })

  it('rejects a name that is too long', async () => {
    const { owner, templateId } = await setup()
    await expect(
      owner.as.mutation(api.invoices.create, { today: TODAY, templateId, name: 'x'.repeat(201) }),
    ).rejects.toThrow(/invalid/)
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
