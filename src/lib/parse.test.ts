import { describe, expect, it } from 'vitest'

import { money, percent, quantity } from './parse'

describe('money', () => {
  it('round-trips', () => {
    expect(money.parse('1,250.5')).toBe(125050)
    expect(money.format(125050)).toBe('1250.50')
    expect(money.format(0)).toBe('')
  })
})

describe('quantity', () => {
  it.each([
    ['20', 20],
    ['1.5', 1.5],
    ['0.125', 0.125],
    ['', 0],
    ['1,000', 1000],
  ])('%j → %d', (text, value) => {
    expect(quantity.parse(text)).toBe(value)
  })
  it.each(['-1', 'abc', '1.2345', '1e3'])('rejects %j', (text) => {
    expect(quantity.parse(text)).toBeNull()
  })
})

describe('percent', () => {
  it.each([
    ['8', 800],
    ['6.5', 650],
    ['8%', 800],
    ['100', 10_000],
    ['', 0],
  ])('%j → %d bps', (text, bps) => {
    expect(percent.parse(text)).toBe(bps)
  })
  it.each(['101', '-1', 'x', '1.234'])('rejects %j', (text) => {
    expect(percent.parse(text)).toBeNull()
  })
  it('formats basis points', () => {
    expect(percent.format(650)).toBe('6.5')
    expect(percent.format(0)).toBe('')
  })
})
