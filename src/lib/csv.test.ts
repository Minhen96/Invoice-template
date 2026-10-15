import { describe, expect, it } from 'vitest'

import { toCsv } from './csv'

describe('toCsv', () => {
  it('joins cells and rows', () => {
    expect(
      toCsv([
        ['a', 1],
        ['b', 2.5],
      ]),
    ).toBe('a,1\r\nb,2.5')
  })

  it('quotes commas, quotes and new lines', () => {
    expect(toCsv([['Lim, Kai Xin', 'say "hi"', 'two\nlines']])).toBe(
      '"Lim, Kai Xin","say ""hi""","two\nlines"',
    )
  })

  it('neutralises spreadsheet formulas', () => {
    expect(toCsv([['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)']])).toBe(
      `"'=HYPERLINK(""x"")",'+1,'-2,'@SUM(A1)`,
    )
  })

  it('leaves negative numbers alone', () => {
    expect(toCsv([[-5]])).toBe('-5')
  })
})
