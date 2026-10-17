import { describe, expect, it } from 'vitest'

import { computeTotals, lineAmountSen } from './invoiceMath'

describe('lineAmountSen', () => {
  it('multiplies rate by quantity in whole sen', () => {
    expect(lineAmountSen({ rateSen: 25000, quantity: 20 })).toBe(500000)
    expect(lineAmountSen({ rateSen: 3333, quantity: 1.5 })).toBe(5000) // 4999.5 → 5000
    expect(lineAmountSen({ rateSen: 100, quantity: 0 })).toBe(0)
  })

  it('treats non-finite input as zero', () => {
    expect(lineAmountSen({ rateSen: 100, quantity: Number.NaN })).toBe(0)
  })
})

describe('computeTotals', () => {
  const items = [
    { rateSen: 25000, quantity: 20 },
    { rateSen: 1050, quantity: 3 },
  ]

  it('adds up lines with no discount or tax', () => {
    expect(computeTotals({ items, discountSen: 0, taxRateBps: 0 })).toEqual({
      subtotalSen: 503150,
      discountSen: 0,
      taxSen: 0,
      totalSen: 503150,
    })
  })

  it('applies tax after the discount', () => {
    // (503150 - 3150) × 8% = 40000
    expect(computeTotals({ items, discountSen: 3150, taxRateBps: 800 })).toEqual({
      subtotalSen: 503150,
      discountSen: 3150,
      taxSen: 40000,
      totalSen: 540000,
    })
  })

  it('never discounts below zero', () => {
    const totals = computeTotals({
      items: [{ rateSen: 1000, quantity: 1 }],
      discountSen: 5000,
      taxRateBps: 600,
    })
    expect(totals).toEqual({ subtotalSen: 1000, discountSen: 1000, taxSen: 0, totalSen: 0 })
  })

  it('handles an empty invoice', () => {
    expect(computeTotals({ items: [], discountSen: 0, taxRateBps: 0 }).totalSen).toBe(0)
  })
})
