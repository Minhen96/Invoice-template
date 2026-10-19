import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import { DEFAULT_TEMPLATE } from './lib/defaults'
import { isSupportedImage } from './lib/logo'
import { seedDefaultTemplate } from './templates'
import { createTemplate, signedInUser, setupBackend, TODAY } from './test.helpers'

function pngBlob() {
  const bytes = new Uint8Array(100)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return new Blob([bytes])
}

describe('templates', () => {
  it('creates from defaults, lists A→Z and updates', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const id = await as.mutation(api.templates.create, {})
    await createTemplate(as, { name: 'Announcer' })
    expect((await as.query(api.templates.list, {})).map((x) => x.name)).toEqual([
      'Announcer',
      'My template',
    ])

    await as.mutation(api.templates.update, { id, ...DEFAULT_TEMPLATE, name: '  Voice-over ' })
    expect((await as.query(api.templates.get, { id }))?.name).toBe('Voice-over')
  })

  it.each([
    ['a blank name', { name: '  ' }],
    ['a bad accent', { accent: 'pink' }],
    ['due days out of range', { dueDays: 400 }],
    [
      'a very long column heading',
      { columns: { ...DEFAULT_TEMPLATE.columns, rate: 'x'.repeat(201) } },
    ],
  ])('rejects %s', async (_, patch) => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    await expect(createTemplate(as, patch)).rejects.toThrow(/invalid/)
  })

  it('returns null for a mangled id from the URL', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    expect(await as.query(api.templates.get, { id: 'nope' })).toBeNull()
  })

  it('duplicates as a copy', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const id = await createTemplate(as, { name: 'Announcer', title: 'RECEIPT' })
    const copy = await as.mutation(api.templates.duplicate, { id })
    expect(await as.query(api.templates.get, { id: copy })).toMatchObject({
      name: 'Announcer (copy)',
      title: 'RECEIPT',
    })
  })

  it('deleting a template keeps its invoices and forgets it as the last used', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const id = await createTemplate(as, { title: 'RECEIPT' })
    await createTemplate(as, { name: 'Other' })
    const invoiceId = await as.mutation(api.invoices.create, { today: TODAY, templateId: id })
    await as.mutation(api.templates.remove, { id })
    expect((await as.query(api.invoices.get, { id: invoiceId }))?.title).toBe('RECEIPT')
    expect((await as.query(api.profiles.get, {}))?.lastTemplateId).toBeNull()
  })
})

describe('the default template', () => {
  it('is given once to a new account', async () => {
    const t = setupBackend()
    const { as, userId } = await signedInUser(t)
    await t.run((ctx) => seedDefaultTemplate(ctx, userId))
    await t.run((ctx) => seedDefaultTemplate(ctx, userId))
    expect(await as.query(api.templates.list, {})).toMatchObject([
      { ...DEFAULT_TEMPLATE, name: 'Default' },
    ])
  })

  it('is added to older accounts without any template, and only to them', async () => {
    const t = setupBackend()
    const empty = await signedInUser(t, 'empty@example.com')
    const set = await signedInUser(t, 'set@example.com')
    await createTemplate(set.as, { name: 'Mine' })
    await t.mutation(internal.templates.seedMissingDefaults, {})
    expect((await empty.as.query(api.templates.list, {})).map((x) => x.name)).toEqual(['Default'])
    expect((await set.as.query(api.templates.list, {})).map((x) => x.name)).toEqual(['Mine'])
  })

  it('the last template can’t be deleted', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const id = await createTemplate(as)
    await expect(as.mutation(api.templates.remove, { id })).rejects.toThrow(/last_template/)
    expect(await as.query(api.templates.list, {})).toHaveLength(1)
  })

  it('a new template can use a chosen business and bank account', async () => {
    const t = setupBackend()
    const { as, userId } = await signedInUser(t)
    const { businessId, bankAccountId } = await t.run(async (ctx) => ({
      businessId: await ctx.db.insert('businesses', {
        userId,
        isDefault: true,
        name: 'Astro',
        regNo: '',
        address: '',
        email: '',
        phone: '',
      }),
      bankAccountId: await ctx.db.insert('bankAccounts', {
        userId,
        isDefault: true,
        accountName: '',
        idLabel: '',
        idNumber: '',
        bankName: 'Maybank',
        accountNumber: '',
        extra: '',
      }),
    }))
    const id = await as.mutation(api.templates.create, { businessId, bankAccountId })
    expect(await as.query(api.templates.get, { id })).toMatchObject({ businessId, bankAccountId })
  })
})

describe('template logos', () => {
  it('accepts a real image, copies it onto new invoices and rejects other files', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const id = await createTemplate(as)
    const png = await t.run((ctx) => ctx.storage.store(pngBlob()))
    await as.action(api.templates.setLogo, { id, storageId: png })
    expect((await as.query(api.templates.get, { id }))?.logoUrl).toEqual(expect.any(String))

    const invoiceId = await as.mutation(api.invoices.create, { today: TODAY, templateId: id })
    expect((await as.query(api.invoices.get, { id: invoiceId }))?.logoUrl).toEqual(
      expect.any(String),
    )

    // Claims to be a PNG, but the bytes say otherwise.
    const fake = await t.run((ctx) =>
      ctx.storage.store(new Blob(['%PDF-1.7 fake'], { type: 'image/png' })),
    )
    await expect(as.action(api.templates.setLogo, { id, storageId: fake })).rejects.toThrow(
      /invalid/,
    )
    expect(await t.run((ctx) => ctx.storage.getUrl(fake))).toBeNull()
  })

  it('keeps a logo file while an invoice still shows it, and deletes it once unused', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const id = await createTemplate(as)
    const png = await t.run((ctx) => ctx.storage.store(pngBlob()))
    await as.action(api.templates.setLogo, { id, storageId: png })
    const invoiceId = await as.mutation(api.invoices.create, { today: TODAY, templateId: id })

    await as.mutation(api.templates.removeLogo, { id })
    expect((await as.query(api.templates.get, { id }))?.logoUrl).toBeNull()
    expect(await t.run((ctx) => ctx.storage.getUrl(png))).not.toBeNull()

    await as.mutation(api.invoices.remove, { id: invoiceId })
    const other = await t.run((ctx) => ctx.storage.store(pngBlob()))
    await as.action(api.templates.setLogo, { id, storageId: other })
    await as.mutation(api.templates.removeLogo, { id })
    expect(await t.run((ctx) => ctx.storage.getUrl(other))).toBeNull()
  })
})

describe('isSupportedImage', () => {
  const bytes = (...values: number[]) =>
    new Uint8Array([...values, ...new Array<number>(12).fill(0)])
  it('recognises PNG, JPEG and WebP signatures', () => {
    expect(isSupportedImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(true)
    expect(isSupportedImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true)
    expect(
      isSupportedImage(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)),
    ).toBe(true)
  })
  it('rejects SVG, GIF and unknown files', () => {
    expect(isSupportedImage(new TextEncoder().encode('<svg xmlns="'))).toBe(false)
    expect(isSupportedImage(new TextEncoder().encode('GIF89a......'))).toBe(false)
  })
})
