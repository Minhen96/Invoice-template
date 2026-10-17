import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { getOwned, requireUserId } from './lib/auth'
import { ensureADefault, listOwn, makeDefault } from './lib/defaultable'
import { checkPayment } from './lib/rules'
import { payment } from './lib/validators'

/** Bank accounts clients pay into; the default first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    return listOwn(ctx, userId, 'bankAccounts')
  },
})

/** Add a bank account. The first one (or one marked default) becomes the default. */
export const create = mutation({
  args: { ...payment.fields, makeDefault: v.optional(v.boolean()) },
  handler: async (ctx, { makeDefault: wantsDefault = false, ...fields }) => {
    const userId = await requireUserId(ctx)
    checkPayment(fields)
    const existing = await listOwn(ctx, userId, 'bankAccounts')
    const id = await ctx.db.insert('bankAccounts', { userId, ...fields, isDefault: false })
    if (wantsDefault || existing.length === 0) await makeDefault(ctx, userId, 'bankAccounts', id)
    return id
  },
})

export const update = mutation({
  args: { id: v.id('bankAccounts'), ...payment.fields },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    checkPayment(fields)
    await ctx.db.patch(id, fields)
  },
})

export const setDefault = mutation({
  args: { id: v.id('bankAccounts') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await makeDefault(ctx, userId, 'bankAccounts', id)
  },
})

/** Invoices keep their own copy; templates that used it fall back to the default. */
export const remove = mutation({
  args: { id: v.id('bankAccounts') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await ctx.db.delete(id)
    await ensureADefault(ctx, userId, 'bankAccounts')
  },
})
