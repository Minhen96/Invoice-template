import { describe, expect, it } from 'vitest'

import { shiftMonths } from './monthShift'

describe('shiftMonths', () => {
  it.each([
    ['FULL TIME ANNOUNCER OCT 2026\n(20 days)', 'FULL TIME ANNOUNCER NOV 2026\n(20 days)'],
    ['Retainer December 2026', 'Retainer January 2027'],
    ['Dec, 2026 services', 'Jan, 2027 services'],
    ['Sept work', 'Oct work'],
    ['September', 'October'],
    ['Jan–Feb', 'Feb–Mar'],
    ['may 2026', 'jun 2026'],
    ['MAY', 'JUN'],
  ])('%j → %j', (input, output) => {
    expect(shiftMonths(input, 1)).toBe(output)
  })

  it('moves backwards across a year', () => {
    expect(shiftMonths('JAN 2027', -1)).toBe('DEC 2026')
  })

  it.each([
    'Payment may be made by transfer',
    'May I remind you',
    'Do not mar the finish',
    'Marching band',
    'Mayor visit',
    'decide later',
  ])('leaves ordinary words alone: %j', (text) => {
    expect(shiftMonths(text, 1)).toBe(text)
  })
})
