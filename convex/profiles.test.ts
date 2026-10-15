import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import { DEFAULT_PROFILE_DEFAULTS } from './lib/defaults'
import { isSupportedImage } from './profiles'
import { signedInUser, setupBackend, TODAY } from './test.helpers'

const business = {
  name: 'LIM KAI XIN TRADING AS LIM KAI XIN',
  regNo: '202303080716 (KT0543198-W)',
  address: 'Kota Bharu, Kelantan',
  email: '',
  phone: '',
}

describe('profiles', () => {
  it('is empty until first saved, then returns what was saved', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    expect(await as.query(api.profiles.get, {})).toBeNull()

    await as.mutation(api.profiles.update, { today: TODAY, business })
    expect(await as.query(api.profiles.get, {})).toMatchObject({
      business,
      defaults: DEFAULT_PROFILE_DEFAULTS,
      nextNumber: '2026001',
      logoUrl: null,
    })
  })

  it('new invoices copy the business details; old invoices keep theirs', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    await as.mutation(api.profiles.update, { today: TODAY, business })
    const firstId = await as.mutation(api.invoices.create, { today: TODAY })

    await as.mutation(api.profiles.update, {
      today: TODAY,
      business: { ...business, address: 'New address' },
    })
    const secondId = await as.mutation(api.invoices.create, { today: TODAY })

    expect((await as.query(api.invoices.get, { id: firstId }))?.from.address).toBe(
      'Kota Bharu, Kelantan',
    )
    expect((await as.query(api.invoices.get, { id: secondId }))?.from.address).toBe('New address')
  })

  it('uses the chosen next number and default terms', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    await as.mutation(api.profiles.update, {
      today: TODAY,
      nextNumber: 'INV-0099',
      defaults: { ...DEFAULT_PROFILE_DEFAULTS, dueDays: null, template: 'minimal' },
    })
    const id = await as.mutation(api.invoices.create, { today: TODAY })
    expect(await as.query(api.invoices.get, { id })).toMatchObject({
      number: 'INV-0099',
      dueDate: '',
      template: 'minimal',
    })
    expect((await as.query(api.profiles.get, {}))?.nextNumber).toBe('INV-0100')
  })

  it.each([
    ['due days out of range', { defaults: { ...DEFAULT_PROFILE_DEFAULTS, dueDays: 400 } }],
    ['bad accent', { defaults: { ...DEFAULT_PROFILE_DEFAULTS, accent: 'pink' } }],
    ['empty next number', { nextNumber: '' }],
    ['very long name', { business: { ...business, name: 'x'.repeat(201) } }],
  ])('rejects %s', async (_, patch) => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    await expect(as.mutation(api.profiles.update, { today: TODAY, ...patch })).rejects.toThrow(
      /invalid/,
    )
  })

  it('accepts a small image as the logo and rejects other files', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const pngBytes = new Uint8Array(100)
    pngBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const png = await t.run((ctx) => ctx.storage.store(new Blob([pngBytes])))
    await as.action(api.profiles.setLogo, { storageId: png, today: TODAY })
    expect((await as.query(api.profiles.get, {}))?.logoUrl).toEqual(expect.any(String))

    // Claims to be a PNG, but the bytes say otherwise (a PDF).
    const pdf = await t.run((ctx) =>
      ctx.storage.store(new Blob(['%PDF-1.7 fake'], { type: 'image/png' })),
    )
    await expect(as.action(api.profiles.setLogo, { storageId: pdf, today: TODAY })).rejects.toThrow(
      /invalid/,
    )
    // The rejected upload is cleaned up.
    expect(await t.run((ctx) => ctx.storage.getUrl(pdf))).toBeNull()

    await as.mutation(api.profiles.removeLogo, {})
    expect((await as.query(api.profiles.get, {}))?.logoUrl).toBeNull()
    expect(await t.run((ctx) => ctx.storage.getUrl(png))).toBeNull()
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
    expect(
      isSupportedImage(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x41, 0x56, 0x49, 0x20)),
    ).toBe(false)
  })
})
