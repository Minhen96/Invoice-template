import { afterEach, describe, expect, it, vi } from 'vitest'

import { api, internal } from './_generated/api'
import { generateCode, ResetPasswordCode } from './otp'
import { signedInUser, setupBackend, TODAY } from './test.helpers'

describe('account.viewer', () => {
  it('describes the signed-in person and whether they use a password', async () => {
    const t = setupBackend()
    const { as, userId } = await signedInUser(t, 'me@example.com')
    expect(await as.query(api.account.viewer, {})).toEqual({
      email: 'me@example.com',
      name: '',
      image: null,
      hasPassword: false,
    })

    await t.run((ctx) =>
      ctx.db.insert('authAccounts', {
        userId,
        provider: 'password',
        providerAccountId: 'me@example.com',
      }),
    )
    expect((await as.query(api.account.viewer, {}))?.hasPassword).toBe(true)
    expect(await t.query(internal.account.passwordAccountEmail, { userId })).toBe('me@example.com')
  })
})

describe('account actions', () => {
  it('refuse to run signed out', async () => {
    const t = setupBackend()
    await expect(t.action(api.account.signOutOtherDevices, {})).rejects.toThrow(/unauthorized/)
    await expect(
      t.action(api.account.changePassword, { currentPassword: 'a', newPassword: 'b'.repeat(8) }),
    ).rejects.toThrow(/unauthorized/)
  })

  it('refuse a weak new password before checking anything else', async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    await expect(
      as.action(api.account.changePassword, { currentPassword: 'old', newPassword: 'short' }),
    ).rejects.toThrow(/weak_password/)
  })
})

describe('backup.exportData', () => {
  it("contains the user's own data without internal ids", async () => {
    const t = setupBackend()
    const { as } = await signedInUser(t)
    await as.mutation(api.clients.create, {
      name: 'Acme',
      address: '',
      attention: '',
      email: '',
      notes: '',
    })
    await as.mutation(api.invoices.create, { today: TODAY })
    const other = await signedInUser(t, 'other@example.com')
    await other.as.mutation(api.invoices.create, { today: TODAY })

    const data = await as.query(api.backup.exportData, {})
    expect(data.version).toBe(1)
    expect(data.profile?.nextNumber).toBe('2026002')
    expect(data.clients).toEqual([
      { name: 'Acme', address: '', attention: '', email: '', notes: '' },
    ])
    expect(data.invoices).toHaveLength(1)
    expect(data.invoices[0]).not.toHaveProperty('_id')
    expect(data.invoices[0]).not.toHaveProperty('userId')
  })
})

describe('sign-in codes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('are 6 random digits', () => {
    const codes = new Set(Array.from({ length: 50 }, generateCode))
    for (const code of codes) expect(code).toMatch(/^\d{6}$/)
    expect(codes.size).toBeGreaterThan(45)
  })

  function send(ctx?: unknown) {
    const request = ResetPasswordCode.sendVerificationRequest as (
      params: { identifier: string; token: string },
      ctx?: unknown,
    ) => Promise<void>
    return request({ identifier: 'me@example.com', token: '123456' }, ctx)
  }

  it('are emailed through Resend', async () => {
    vi.stubEnv('AUTH_RESEND_KEY', 're_test')
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    await send()
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer re_test' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      to: ['me@example.com'],
      subject: 'Your password reset code',
    })
  })

  it('fail loudly when Resend refuses, without leaking the address', async () => {
    vi.stubEnv('AUTH_RESEND_KEY', 're_test')
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('nope', { status: 403 })))
    await expect(send()).rejects.toThrow('Resend rejected the email (HTTP 403)')
  })

  it('need a Resend key unless the dev outbox is on', async () => {
    vi.stubEnv('AUTH_RESEND_KEY', '')
    vi.stubEnv('AUTH_DEV_OUTBOX', '')
    await expect(send()).rejects.toThrow('AUTH_RESEND_KEY is not set')
  })

  it('go to the dev outbox for local testing', async () => {
    vi.stubEnv('AUTH_RESEND_KEY', '')
    vi.stubEnv('AUTH_DEV_OUTBOX', 'true')
    const t = setupBackend()
    // Convex Auth passes the action ctx; only runMutation is used.
    await send({
      runMutation: (ref: typeof internal.devOutbox.record, args: Record<string, string>) =>
        t.mutation(ref, args as { email: string; code: string; purpose: string }),
    })
    expect(await t.query(internal.devOutbox.latest, { email: 'Me@Example.com' })).toEqual({
      code: '123456',
      purpose: 'reset',
    })
  })

  it('dev outbox refuses writes when switched off', async () => {
    vi.stubEnv('AUTH_DEV_OUTBOX', '')
    const t = setupBackend()
    await expect(
      t.mutation(internal.devOutbox.record, { email: 'a@b.co', code: '1', purpose: 'verify' }),
    ).rejects.toThrow('Dev outbox is disabled')
  })
})
