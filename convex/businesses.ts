import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { getOwned, requireUserId } from './lib/auth'
import { ensureADefault, listOwn, makeDefault } from './lib/defaultable'
import { checkBusiness } from './lib/rules'
import { business } from './lib/validators'

/** Businesses you invoice as; the default first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    return listOwn(ctx, userId, 'businesses')
  },
})

/** Add a business. The first one (or one marked default) becomes the default. */
export const create = mutation({
  args: { ...business.fields, makeDefault: v.optional(v.boolean()) },
  handler: async (ctx, { makeDefault: wantsDefault = false, ...fields }) => {
    const userId = await requireUserId(ctx)
    checkBusiness(fields, 'business')
    const existing = await listOwn(ctx, userId, 'businesses')
    const id = await ctx.db.insert('businesses', { userId, ...fields, isDefault: false })
    if (wantsDefault || existing.length === 0) await makeDefault(ctx, userId, 'businesses', id)
    return id
  },
})

export const update = mutation({
  args: { id: v.id('businesses'), ...business.fields },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    checkBusiness(fields, 'business')
    await ctx.db.patch(id, fields)
  },
})

export const setDefault = mutation({
  args: { id: v.id('businesses') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await makeDefault(ctx, userId, 'businesses', id)
  },
})

/** Invoices keep their own copy; templates that used it fall back to the default. */
export const remove = mutation({
  args: { id: v.id('businesses') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await ctx.db.delete(id)
    await ensureADefault(ctx, userId, 'businesses')
  },
})
