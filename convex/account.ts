import {
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'

import { internal } from './_generated/api'
import { action, internalQuery, query } from './_generated/server'
import { requireUserId } from './lib/auth'
import { passwordProblem } from './lib/credentials'
import { appError } from './lib/rules'

/** The signed-in person, or null when signed out (used by route guards). */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null
    const user = await ctx.db.get(userId)
    if (!user) return null
    const passwordAccount = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId).eq('provider', 'password'))
      .unique()
    return {
      email: user.email ?? '',
      name: user.name ?? '',
      image: user.image ?? null,
      hasPassword: passwordAccount !== null,
    }
  },
})

export const passwordAccountEmail = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const account = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId).eq('provider', 'password'))
      .unique()
    return account?.providerAccountId ?? null
  },
})

/** Ends every session except this one (lost phone, shared computer). */
export const signOutOtherDevices = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    const sessionId = await getAuthSessionId(ctx)
    await invalidateSessions(ctx, { userId, except: sessionId ? [sessionId] : [] })
  },
})

/** Change password (current one required), then sign out other devices. */
export const changePassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const userId = await requireUserId(ctx)
    if (passwordProblem(newPassword) !== null) {
      throw new ConvexError({ code: 'weak_password', field: 'newPassword' })
    }
    const email = await ctx.runQuery(internal.account.passwordAccountEmail, { userId })
    if (email === null) throw appError('not_found')
    try {
      await retrieveAccount(ctx, {
        provider: 'password',
        account: { id: email, secret: currentPassword },
      })
    } catch {
      throw new ConvexError({ code: 'wrong_password', field: 'currentPassword' })
    }
    await modifyAccountCredentials(ctx, {
      provider: 'password',
      account: { id: email, secret: newPassword },
    })
    const sessionId = await getAuthSessionId(ctx)
    await invalidateSessions(ctx, { userId, except: sessionId ? [sessionId] : [] })
  },
})
