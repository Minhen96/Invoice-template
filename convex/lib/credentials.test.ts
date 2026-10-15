import { describe, expect, it } from 'vitest'

import { normaliseEmail, passwordProblem } from './credentials'
import { renderCodeEmail } from './email'

describe('normaliseEmail', () => {
  it('trims and lower-cases, keeping dots and +tags', () => {
    expect(normaliseEmail('  Jane.Doe+inv@Example.COM ')).toBe('jane.doe+inv@example.com')
  })
  it.each([undefined, 3, '', 'no-at-sign', 'a@b', 'a b@c.com'])('rejects %j', (value) => {
    expect(normaliseEmail(value)).toBeNull()
  })
})

describe('passwordProblem', () => {
  it('needs 8 to 128 characters', () => {
    expect(passwordProblem('1234567')).toBe('too_short')
    expect(passwordProblem('12345678')).toBeNull()
    expect(passwordProblem('x'.repeat(129))).toBe('too_long')
  })
})

describe('renderCodeEmail', () => {
  it('includes the code in text and html', () => {
    const email = renderCodeEmail('reset', '012345')
    expect(email.subject).toMatch(/reset/i)
    expect(email.text).toContain('012345')
    expect(email.html).toContain('012345')
  })
  it('refuses anything that is not a 6-digit code', () => {
    expect(() => renderCodeEmail('verify', '<b>1</b>')).toThrow()
  })
})
