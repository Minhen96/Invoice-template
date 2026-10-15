import { describe, expect, it } from 'vitest'

import { formatSen, MAX_SEN, parseMoney, roundSen, senToInput } from './money'

describe('parseMoney', () => {
  it.each([
    ['0', 0],
    ['', 0],
    ['20', 2000],
    ['20.5', 2050],
    ['20.50', 2050],
    ['.5', 50],
    ['1,234.56', 123456],
    ['RM 1,000', 100000],
    ['  7.00 ', 700],
    ['250.', 25000],
  ])('reads %j as %i sen', (input, sen) => {
    expect(parseMoney(input)).toBe(sen)
  })

  it.each(['-5', 'abc', '1.234', '1.2.3', '12a', '1e5'])('rejects %j', (input) => {
    expect(parseMoney(input)).toBeNull()
  })

  it('rejects amounts above the maximum', () => {
    expect(parseMoney(String(MAX_SEN / 100 + 1))).toBeNull()
    expect(parseMoney(String(MAX_SEN / 100))).toBe(MAX_SEN)
  })
})

describe('formatSen', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [123456, '1,234.56'],
    [100000000, '1,000,000.00'],
    [-2550, '-25.50'],
  ])('%i → %s', (sen, text) => {
    expect(formatSen(sen)).toBe(text)
  })
})

describe('roundSen', () => {
  it('rounds half away from zero', () => {
    expect(roundSen(2.5)).toBe(3)
    expect(roundSen(2.4999)).toBe(2)
    expect(roundSen(-2.5)).toBe(-3)
  })

  it('survives float noise from multiplication', () => {
    // 1.005 * 100 = 100.49999999999999 in floating point.
    expect(roundSen(1.005 * 100)).toBe(101)
  })
})

describe('senToInput', () => {
  it('shows two decimals without separators', () => {
    expect(senToInput(123456)).toBe('1234.56')
    expect(senToInput(0)).toBe('0.00')
  })
})
