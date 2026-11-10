import { describe, expect, it } from 'vitest'

import { api, internal } from './_generated/api'
import { setupBackend } from './test.helpers'

describe('seed:account', () => {
  it('creates a confirmed password account with the default template', async () => {
    const t = setupBackend()
    const { userId, email } = await t.action(internal.seed.account, {
      email: ' Admin@Example.com ',
      password: 'correct-horse',
    })
    expect(email).toBe('admin@example.com')

    const { user, account } = await t.run(async (ctx) => ({
      user: await ctx.db.get(userId),
      account: await ctx.db
        .query('authAccounts')
        .withIndex('userIdAndProvider', (q) => q.eq('userId', userId).eq('provider', 'password'))
        .unique(),
    }))
    expect(user).toMatchObject({ email: 'admin@example.com' })
    expect(user?.emailVerificationTime).toEqual(expect.any(Number))
    expect(account).toMatchObject({
      providerAccountId: 'admin@example.com',
      emailVerified: 'admin@example.com',
    })
    // Stored hashed, never as typed.
    expect(account?.secret).toEqual(expect.any(String))
    expect(account?.secret).not.toBe('correct-horse')

    const sessionId = await t.run((ctx) =>
      ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + 86_400_000 }),
    )
    const as = t.withIdentity({ subject: `${userId}|${sessionId}` })
    expect((await as.query(api.templates.list, {})).map((x) => x.name)).toEqual(['Default'])
  })

  it('refuses a short password, a bad email and an existing account', async () => {
    const t = setupBackend()
    await expect(
      t.action(internal.seed.account, { email: 'a@example.com', password: 'short' }),
    ).rejects.toThrow(/too short/)
    await expect(
      t.action(internal.seed.account, { email: 'not-an-email', password: 'correct-horse' }),
    ).rejects.toThrow(/email/)
    await t.action(internal.seed.account, { email: 'a@example.com', password: 'correct-horse' })
    await expect(
      t.action(internal.seed.account, { email: 'A@example.com', password: 'other-horse' }),
    ).rejects.toThrow(/already exists/)
  })
})
