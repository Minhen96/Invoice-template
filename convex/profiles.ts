import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { requireUserId } from './lib/auth'
import { isIsoDate } from './lib/dates'
import { firstInvoiceNumber } from './lib/numbering'
import { appError, checkNumber } from './lib/rules'

export async function findProfile(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<Doc<'profiles'> | null> {
  return ctx.db
    .query('profiles')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
}

/** The user's profile, created on first use. */
export async function ensureProfile(
  ctx: MutationCtx,
  userId: Id<'users'>,
  today: string,
): Promise<Doc<'profiles'>> {
  const existing = await findProfile(ctx, userId)
  if (existing) return existing
  if (!isIsoDate(today)) throw appError('invalid', 'today')
  const id = await ctx.db.insert('profiles', {
    userId,
    nextNumber: firstInvoiceNumber(today),
  })
  const created = await ctx.db.get(id)
  if (!created) throw appError('not_found')
  return created
}

/** Numbering and last-used choices. `null` until first saved. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    const profile = await findProfile(ctx, userId)
    if (!profile) return null
    return {
      nextNumber: profile.nextNumber,
      lastTemplateId: profile.lastTemplateId ?? null,
      lastClientId: profile.lastClientId ?? null,
    }
  },
})

export const update = mutation({
  args: { today: v.string(), nextNumber: v.string() },
  handler: async (ctx, { today, nextNumber }) => {
    const userId = await requireUserId(ctx)
    const tidy = nextNumber.trim()
    checkNumber(tidy, 'nextNumber')
    const profile = await ensureProfile(ctx, userId, today)
    await ctx.db.patch(profile._id, { nextNumber: tidy })
  },
})
