import { afterEach, describe, expect, it, vi } from 'vitest'

import { api, internal } from './_generated/api'
import { generateCode, ResetPasswordCode } from './otp'
import { createTemplate, signedInUser, setupBackend, TODAY } from './test.helpers'

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
    const templateId = await createTemplate(as, { name: 'Announcer' })
    const invoiceId = await as.mutation(api.invoices.create, { today: TODAY, templateId })
    await as.mutation(api.items.rememberFromInvoice, { invoiceId })
    const other = await signedInUser(t, 'other@example.com')
    await other.as.mutation(api.invoices.create, {
      today: TODAY,
      templateId: await createTemplate(other.as),
    })

    const data = await as.query(api.backup.exportData, {})
    expect(data.version).toBe(4)
    expect(data.nextNumber).toBe('2026002')
    expect(data.templates.map((x) => x.name)).toEqual(['Announcer'])
    expect(data.items).toEqual([])
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

  it('need a Resend key unless a dev inbox is on', async () => {
    vi.stubEnv('AUTH_RESEND_KEY', '')
    vi.stubEnv('AUTH_DEV_OUTBOX', '')
    vi.stubEnv('AUTH_MAILPIT_URL', '')
    await expect(send()).rejects.toThrow('AUTH_RESEND_KEY is not set')
  })

  it('land in the local Mailpit inbox during development', async () => {
    vi.stubEnv('AUTH_RESEND_KEY', '')
    vi.stubEnv('AUTH_DEV_OUTBOX', '')
    vi.stubEnv('AUTH_MAILPIT_URL', 'http://127.0.0.1:8025/')
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    await send()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:8025/api/v1/send')
    expect(JSON.parse(init.body as string)).toMatchObject({
      To: [{ Email: 'me@example.com' }],
      Subject: 'Your password reset code',
      Text: expect.stringContaining('123456') as unknown,
    })
  })

  it('report a Mailpit failure', async () => {
    vi.stubEnv('AUTH_RESEND_KEY', '')
    vi.stubEnv('AUTH_DEV_OUTBOX', '')
    vi.stubEnv('AUTH_MAILPIT_URL', 'http://127.0.0.1:8025')
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })))
    await expect(send()).rejects.toThrow('Mailpit rejected the email (HTTP 500)')
  })

  it('always use Resend when its key is set, even if Mailpit is configured', async () => {
    vi.stubEnv('AUTH_RESEND_KEY', 're_test')
    vi.stubEnv('AUTH_MAILPIT_URL', 'http://127.0.0.1:8025')
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    await send()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://api.resend.com/emails',
    )
  })

  it('go to the dev outbox for local testing', async () => {
    vi.stubEnv('AUTH_RESEND_KEY', '')
    vi.stubEnv('AUTH_DEV_OUTBOX', 'true')
    vi.stubEnv('AUTH_MAILPIT_URL', '')
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

describe('account.deleteAccount', () => {
  async function accountWithData(t: ReturnType<typeof setupBackend>, email: string) {
    const { as, userId } = await signedInUser(t, email)
    const templateId = await createTemplate(as)
    await as.mutation(api.invoices.create, { today: TODAY, templateId })
    await as.mutation(api.clients.create, {
      name: 'Acme',
      address: '',
      attention: '',
      email: '',
      notes: '',
    })
    await as.mutation(api.items.create, { description: 'Editing', rateSen: 100 })
    await as.mutation(api.businesses.create, {
      name: 'Studio',
      regNo: '',
      address: '',
      email: '',
      phone: '',
    })
    await as.mutation(api.bankAccounts.create, {
      accountName: 'Me',
      idLabel: 'IC No',
      idNumber: '',
      bankName: 'Bank',
      accountNumber: '1',
      extra: '',
    })
    const logoId = await t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob(['logo']))
      const template = await ctx.db.get(templateId)
      if (template) await ctx.db.patch(templateId, { logoId: id })
      const accountId = await ctx.db.insert('authAccounts', {
        userId,
        provider: 'password',
        providerAccountId: email,
      })
      await ctx.db.insert('authVerificationCodes', {
        accountId,
        provider: 'password',
        code: 'x',
        expirationTime: Date.now() + 60_000,
      })
      return id
    })
    return { as, userId, logoId }
  }

  /** Everything still stored for this user, table by table. */
  async function leftovers(t: ReturnType<typeof setupBackend>, userId: string) {
    return t.run(async (ctx) => {
      const owned = async (
        table:
          | 'invoices'
          | 'templates'
          | 'clients'
          | 'items'
          | 'businesses'
          | 'bankAccounts'
          | 'profiles',
      ) => (await ctx.db.query(table).collect()).filter((row) => row.userId === userId).length
      return {
        invoices: await owned('invoices'),
        templates: await owned('templates'),
        clients: await owned('clients'),
        items: await owned('items'),
        businesses: await owned('businesses'),
        bankAccounts: await owned('bankAccounts'),
        profiles: await owned('profiles'),
        sessions: (await ctx.db.query('authSessions').collect()).filter((s) => s.userId === userId)
          .length,
        accounts: (await ctx.db.query('authAccounts').collect()).filter((a) => a.userId === userId)
          .length,
        user: (await ctx.db.get(userId as never)) === null ? 0 : 1,
      }
    })
  }

  it('removes everything the account owns, and only that', async () => {
    const t = setupBackend()
    const alice = await accountWithData(t, 'alice@example.com')
    const bob = await accountWithData(t, 'bob@example.com')
    const before = await leftovers(t, bob.userId)

    await alice.as.mutation(api.account.deleteAccount, { confirmEmail: ' Alice@Example.com ' })

    expect(Object.values(await leftovers(t, alice.userId)).every((n) => n === 0)).toBe(true)
    expect(await t.run((ctx) => ctx.db.query('authVerificationCodes').collect())).toHaveLength(1)
    expect(await t.run((ctx) => ctx.storage.getUrl(alice.logoId))).toBeNull()
    // Bob is untouched.
    expect(await leftovers(t, bob.userId)).toEqual(before)
    expect(await t.run((ctx) => ctx.storage.getUrl(bob.logoId))).not.toBeNull()
  })

  it('needs the account email typed to confirm', async () => {
    const t = setupBackend()
    const alice = await accountWithData(t, 'alice@example.com')
    await expect(
      alice.as.mutation(api.account.deleteAccount, { confirmEmail: 'bob@example.com' }),
    ).rejects.toThrow(/invalid/)
    expect((await leftovers(t, alice.userId)).invoices).toBe(1)
  })

  it('refuses to run signed out', async () => {
    const t = setupBackend()
    await expect(
      t.mutation(api.account.deleteAccount, { confirmEmail: 'a@example.com' }),
    ).rejects.toThrow(/unauthorized/)
  })
})
