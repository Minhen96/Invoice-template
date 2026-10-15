import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { getOwned, requireUserId } from './lib/auth'
import { checkClient } from './lib/rules'
import { clientFields } from './lib/validators'

function tidy<T extends { name: string; email: string }>(fields: T): T {
  return { ...fields, name: fields.name.trim(), email: fields.email.trim() }
}

/** Saved clients, A→Z. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    return ctx.db
      .query('clients')
      .withIndex('by_user_name', (q) => q.eq('userId', userId))
      .collect()
  },
})

export const create = mutation({
  args: clientFields,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const fields = tidy(args)
    checkClient(fields)
    return ctx.db.insert('clients', { userId, ...fields })
  },
})

export const update = mutation({
  args: { id: v.id('clients'), ...clientFields },
  handler: async (ctx, { id, ...args }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    const fields = tidy(args)
    checkClient(fields)
    await ctx.db.patch(id, fields)
  },
})

/** Invoices keep their own copy of the client's details, so they are unaffected. */
export const remove = mutation({
  args: { id: v.id('clients') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    const linked = await ctx.db
      .query('invoices')
      .withIndex('by_user_client', (q) => q.eq('userId', userId).eq('clientId', id))
      .collect()
    for (const invoice of linked) await ctx.db.patch(invoice._id, { clientId: undefined })
    await ctx.db.delete(id)
  },
})
