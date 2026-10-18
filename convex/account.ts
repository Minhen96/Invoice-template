import {
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'

import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { action, internalQuery, mutation, query } from './_generated/server'
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

/**
 * Delete the signed-in account and everything it owns: invoices, clients, items, templates (and
 * their logo files), businesses, bank accounts, numbering, and the sign-in itself (sessions,
 * password / Google link, codes). Can't be undone. The caller types their email to confirm.
 */
export const deleteAccount = mutation({
  args: { confirmEmail: v.string() },
  handler: async (ctx, { confirmEmail }) => {
    const userId = await requireUserId(ctx)
    const user = await ctx.db.get(userId)
    if (!user) throw appError('not_found')
    const email = (user.email ?? '').trim().toLowerCase()
    if (email === '' || confirmEmail.trim().toLowerCase() !== email) {
      throw appError('invalid', 'confirmEmail')
    }

    // What the account owns. One branch per table (Convex index types are per table).
    const logos = new Set<Id<'_storage'>>()
    for (const row of await ctx.db
      .query('invoices')
      .withIndex('by_user_issue', (q) => q.eq('userId', userId))
      .collect()) {
      if (row.logoId) logos.add(row.logoId)
      await ctx.db.delete(row._id)
    }
    for (const row of await ctx.db
      .query('templates')
      .withIndex('by_user_name', (q) => q.eq('userId', userId))
      .collect()) {
      if (row.logoId) logos.add(row.logoId)
      await ctx.db.delete(row._id)
    }
    for (const row of await ctx.db
      .query('clients')
      .withIndex('by_user_name', (q) => q.eq('userId', userId))
      .collect()) {
      await ctx.db.delete(row._id)
    }
    for (const row of await ctx.db
      .query('items')
      .withIndex('by_user_key', (q) => q.eq('userId', userId))
      .collect()) {
      await ctx.db.delete(row._id)
    }
    for (const row of await ctx.db
      .query('businesses')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()) {
      await ctx.db.delete(row._id)
    }
    for (const row of await ctx.db
      .query('bankAccounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()) {
      await ctx.db.delete(row._id)
    }
    for (const row of await ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()) {
      await ctx.db.delete(row._id)
    }
    for (const logoId of logos) await ctx.storage.delete(logoId)
    for (const row of await ctx.db
      .query('devOutbox')
      .withIndex('by_email', (q) => q.eq('email', email))
      .collect()) {
      await ctx.db.delete(row._id)
    }

    // The sign-in: sessions (with their refresh tokens), linked accounts (with their codes).
    for (const session of await ctx.db
      .query('authSessions')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .collect()) {
      for (const token of await ctx.db
        .query('authRefreshTokens')
        .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
        .collect()) {
        await ctx.db.delete(token._id)
      }
      await ctx.db.delete(session._id)
    }
    for (const account of await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .collect()) {
      for (const code of await ctx.db
        .query('authVerificationCodes')
        .withIndex('accountId', (q) => q.eq('accountId', account._id))
        .collect()) {
        await ctx.db.delete(code._id)
      }
      await ctx.db.delete(account._id)
    }
    await ctx.db.delete(userId)
  },
})
