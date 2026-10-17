import { EMPTY_BUSINESS } from '@convex/lib/defaults'
import { describe, expect, it } from 'vitest'

import { asBusiness, asPayment, pickRow } from './parties'

const rows = [
  { _id: 'a', isDefault: false, name: 'A' },
  { _id: 'b', isDefault: true, name: 'B' },
]

describe('pickRow', () => {
  it('prefers the chosen row, then the default, then the first', () => {
    expect(pickRow(rows, 'a')?.name).toBe('A')
    expect(pickRow(rows, 'gone')?.name).toBe('B')
    expect(pickRow(rows)?.name).toBe('B')
    expect(pickRow([{ _id: 'x', isDefault: false, name: 'X' }])?.name).toBe('X')
    expect(pickRow([])).toBeNull()
    expect(pickRow(undefined)).toBeNull()
  })
})

describe('asBusiness / asPayment', () => {
  it('keeps only the printed fields, with blanks when there is none', () => {
    expect(
      asBusiness({
        _id: 'a',
        isDefault: true,
        name: 'A',
        regNo: '',
        address: 'KL',
        email: '',
        phone: '',
      }),
    ).toEqual({ name: 'A', regNo: '', address: 'KL', email: '', phone: '' })
    expect(asBusiness(null)).toEqual(EMPTY_BUSINESS)
    expect(asPayment(null).idLabel).toBe('IC No')
  })
})
