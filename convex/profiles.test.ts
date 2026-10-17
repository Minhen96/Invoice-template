import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import { createTemplate, signedInUser, setupBackend, TODAY } from './test.helpers'

describe('profiles', () => {
  it('is empty until first used', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    expect(await as.query(api.profiles.get, {})).toBeNull()
  })

  it('uses the chosen next number, then counts up', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    await as.mutation(api.profiles.update, { today: TODAY, nextNumber: ' INV-0099 ' })
    const templateId = await createTemplate(as)
    const id = await as.mutation(api.invoices.create, { today: TODAY, templateId })
    expect((await as.query(api.invoices.get, { id }))?.number).toBe('INV-0099')
    expect((await as.query(api.profiles.get, {}))?.nextNumber).toBe('INV-0100')
  })

  it('starts numbering at the year', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    const templateId = await createTemplate(as)
    const id = await as.mutation(api.invoices.create, { today: TODAY, templateId })
    expect((await as.query(api.invoices.get, { id }))?.number).toBe('2026001')
  })

  it('rejects an empty next number', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    await expect(
      as.mutation(api.profiles.update, { today: TODAY, nextNumber: '  ' }),
    ).rejects.toThrow(/invalid/)
  })
})
