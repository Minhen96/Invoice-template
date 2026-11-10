import { createAccount, retrieveAccount } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import { internal } from './_generated/api'
import { internalAction, internalMutation } from './_generated/server'
import { normaliseEmail, passwordProblem } from './lib/credentials'
import { seedDefaultTemplate } from './templates'

/**
 * Create a ready-to-use email + password account (email already confirmed, default template
 * included), e.g. for a demo or an admin login. Internal: run it from a terminal only —
 *   npx convex run seed:account '{"email":"admin@example.com","password":"…"}'  (add --prod)
 * The password is an argument, never stored in the code; it follows the sign-up rules.
 */
export const account = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = normaliseEmail(args.email)
    if (email === null) throw new Error('That email address looks wrong.')
    const problem = passwordProblem(args.password)
    if (problem !== null)
      throw new Error(`Password ${problem.replace('_', ' ')} (8–128 characters).`)
    const existing = await retrieveAccount(ctx, {
      provider: 'password',
      account: { id: email },
    }).catch(() => null)
    if (existing) throw new Error(`An account for ${email} already exists.`)

    const { user } = await createAccount(ctx, {
      provider: 'password',
      account: { id: email, secret: args.password },
      profile: { email },
      shouldLinkViaEmail: false,
    })
    await ctx.runMutation(internal.seed.confirm, { userId: user._id, email })
    return { userId: user._id, email }
  },
})

/** Marks the email as confirmed (no sign-in code needed) and adds the default template. */
export const confirm = internalMutation({
  args: { userId: v.id('users'), email: v.string() },
  handler: async (ctx, { userId, email }) => {
    const account = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId).eq('provider', 'password'))
      .unique()
    if (account) await ctx.db.patch(account._id, { emailVerified: email })
    await ctx.db.patch(userId, { emailVerificationTime: Date.now() })
    await seedDefaultTemplate(ctx, userId)
  },
})
