import { describe, expect, it } from 'vitest'

import { safeRedirect } from './safe-redirect'

describe('safeRedirect', () => {
  it('keeps in-app paths', () => {
    expect(safeRedirect('/invoices/abc?x=1')).toBe('/invoices/abc?x=1')
  })
  it.each([
    undefined,
    42,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'settings',
  ])('falls back for %j', (value) => {
    expect(safeRedirect(value)).toBe('/')
  })
})
