import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import { signedInUser, setupBackend } from './test.helpers'

const biz = (name: string) => ({ name, regNo: '', address: '', email: '', phone: '' })
const bank = (bankName: string) => ({
  accountName: 'Me',
  idLabel: 'IC No',
  idNumber: '',
  bankName,
  accountNumber: '1',
  extra: '',
})

async function setup() {
  const t = setupBackend()
  const { as } = await signedInUser(t)
  return { as }
}

describe('businesses', () => {
  it('the first one is the default; the list shows the default first', async () => {
    const { as } = await setup()
    await as.mutation(api.businesses.create, biz('Studio A'))
    await as.mutation(api.businesses.create, biz('Studio B'))
    expect((await as.query(api.businesses.list, {})).map((b) => [b.name, b.isDefault])).toEqual([
      ['Studio A', true],
      ['Studio B', false],
    ])
  })

  it('can be added as the default, or made the default later — only one at a time', async () => {
    const { as } = await setup()
    const a = await as.mutation(api.businesses.create, biz('Studio A'))
    await as.mutation(api.businesses.create, { ...biz('Studio B'), makeDefault: true })
    expect((await as.query(api.businesses.list, {})).map((b) => [b.name, b.isDefault])).toEqual([
      ['Studio B', true],
      ['Studio A', false],
    ])
    await as.mutation(api.businesses.setDefault, { id: a })
    const list = await as.query(api.businesses.list, {})
    expect(list.filter((b) => b.isDefault).map((b) => b.name)).toEqual(['Studio A'])
  })

  it('deleting the default makes another one the default', async () => {
    const { as } = await setup()
    const a = await as.mutation(api.businesses.create, biz('Studio A'))
    await as.mutation(api.businesses.create, biz('Studio B'))
    await as.mutation(api.businesses.remove, { id: a })
    expect((await as.query(api.businesses.list, {})).map((b) => [b.name, b.isDefault])).toEqual([
      ['Studio B', true],
    ])
  })

  it('updates and validates', async () => {
    const { as } = await setup()
    const a = await as.mutation(api.businesses.create, biz('Studio A'))
    await as.mutation(api.businesses.update, { id: a, ...biz('Studio A Sdn Bhd') })
    expect((await as.query(api.businesses.list, {}))[0]?.name).toBe('Studio A Sdn Bhd')
    await expect(
      as.mutation(api.businesses.update, { id: a, ...biz('x'.repeat(201)) }),
    ).rejects.toThrow(/invalid/)
  })
})

describe('bank accounts', () => {
  it('follow the same default rules', async () => {
    const { as } = await setup()
    const pbb = await as.mutation(api.bankAccounts.create, bank('Public Bank'))
    const mbb = await as.mutation(api.bankAccounts.create, bank('Maybank'))
    await as.mutation(api.bankAccounts.setDefault, { id: mbb })
    expect(
      (await as.query(api.bankAccounts.list, {})).map((b) => [b.bankName, b.isDefault]),
    ).toEqual([
      ['Maybank', true],
      ['Public Bank', false],
    ])
    await as.mutation(api.bankAccounts.remove, { id: mbb })
    await as.mutation(api.bankAccounts.update, { id: pbb, ...bank('Public Bank Berhad') })
    expect(
      (await as.query(api.bankAccounts.list, {})).map((b) => [b.bankName, b.isDefault]),
    ).toEqual([['Public Bank Berhad', true]])
  })
})
