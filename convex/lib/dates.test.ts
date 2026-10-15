import { describe, expect, it } from 'vitest'

import { addDays, addMonths, daysBetween, formatDate, isIsoDate, localIsoDate } from './dates'

describe('isIsoDate', () => {
  it.each(['2026-10-07', '2024-02-29'])('accepts %s', (value) => {
    expect(isIsoDate(value)).toBe(true)
  })
  it.each(['2026-13-01', '2026-02-30', '2025-02-29', '7/10/2026', '2026-1-1', ''])(
    'rejects %j',
    (value) => {
      expect(isIsoDate(value)).toBe(false)
    },
  )
})

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-10-07', 30)).toBe('2026-11-06')
    expect(addDays('2026-12-25', 7)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('leaves invalid input unchanged', () => {
    expect(addDays('nope', 3)).toBe('nope')
  })
})

describe('addMonths', () => {
  it('keeps the day when it exists', () => {
    expect(addMonths('2026-10-07', 1)).toBe('2026-11-07')
  })
  it('rolls the year', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15')
  })
  it('clamps to the last day of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-10-31', 1)).toBe('2026-11-30')
  })
})

describe('daysBetween', () => {
  it('counts calendar days either way', () => {
    expect(daysBetween('2026-10-07', '2026-11-06')).toBe(30)
    expect(daysBetween('2026-11-06', '2026-10-07')).toBe(-30)
    expect(daysBetween('bad', '2026-10-07')).toBe(0)
  })
})

describe('formatDate', () => {
  it.each([
    ['d/m/yyyy', '7/10/2026'],
    ['dd/mm/yyyy', '07/10/2026'],
    ['d MMM yyyy', '7 Oct 2026'],
    ['MMMM d, yyyy', 'October 7, 2026'],
    ['yyyy-mm-dd', '2026-10-07'],
  ] as const)('%s → %s', (format, expected) => {
    expect(formatDate('2026-10-07', format)).toBe(expected)
  })
  it('returns empty text for an empty or invalid date', () => {
    expect(formatDate('')).toBe('')
  })
})

describe('localIsoDate', () => {
  it('uses the local calendar day', () => {
    expect(localIsoDate(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07')
  })
})
