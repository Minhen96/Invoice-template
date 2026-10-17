import { EMPTY_BUSINESS, EMPTY_PAYMENT } from '@convex/lib/defaults'
import { describe, expect, it } from 'vitest'

import { business, payment } from '@/testing/fixtures'

import { missingBusiness, missingPayment, missingSentence } from './completeness'

describe('completeness', () => {
  it('needs a business name and address', () => {
    expect(missingBusiness(EMPTY_BUSINESS)).toEqual(['business name', 'address'])
    expect(missingBusiness({ ...EMPTY_BUSINESS, name: 'Studio', address: '  ' })).toEqual([
      'address',
    ])
    expect(missingBusiness(business)).toEqual([])
  })

  it('needs who and where to pay', () => {
    expect(missingPayment(EMPTY_PAYMENT)).toEqual(['account name', 'bank', 'account number'])
    expect(missingPayment(payment)).toEqual([])
  })

  it('reads naturally', () => {
    expect(missingSentence([])).toBe('')
    expect(missingSentence(['address'])).toBe('Add address.')
    expect(missingSentence(['business name', 'address'])).toBe('Add business name and address.')
    expect(missingSentence(['account name', 'bank', 'account number'])).toBe(
      'Add account name, bank and account number.',
    )
  })
})
