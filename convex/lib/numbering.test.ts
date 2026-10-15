import { describe, expect, it } from 'vitest'

import { firstInvoiceNumber, nextInvoiceNumber } from './numbering'

describe('nextInvoiceNumber', () => {
  it.each([
    ['2026031', '2026032'],
    ['INV-009', 'INV-010'],
    ['INV-2026-99', 'INV-2026-100'],
    ['0099', '0100'],
    ['A12/B', 'A13/B'],
    ['A', 'A-2'],
    ['', '1'],
    ['  7 ', '8'],
    ['99999999999999999999', '100000000000000000000'],
  ])('%j → %j', (current, next) => {
    expect(nextInvoiceNumber(current)).toBe(next)
  })
})

describe('firstInvoiceNumber', () => {
  it('starts at 001 for the year', () => {
    expect(firstInvoiceNumber('2026-10-15')).toBe('2026001')
  })
})
