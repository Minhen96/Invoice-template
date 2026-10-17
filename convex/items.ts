import { v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { getOwned, requireUserId } from './lib/auth'
import { itemKey } from './lib/itemKey'
import { appError, checkItemFields } from './lib/rules'

async function findByKey(ctx: QueryCtx, userId: Id<'users'>, key: string) {
  return ctx.db
    .query('items')
    .withIndex('by_user_key', (q) => q.eq('userId', userId).eq('key', key))
    .first()
}

/** Remembered items, most recently used first (the order the picker suggests them in). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    return ctx.db
      .query('items')
      .withIndex('by_user_used', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

/**
 * Remember the items on an invoice (called when leaving the editor and when downloading the
 * PDF — not on every keystroke, so half-typed text is never remembered). Same description →
 * one item, keeping the latest price.
 */
export const rememberFromInvoice = mutation({
  args: { invoiceId: v.id('invoices') },
  handler: async (ctx, { invoiceId }) => {
    const userId = await requireUserId(ctx)
    const invoice = await getOwned(ctx, userId, invoiceId)
    const now = Date.now()
    const seen = new Set<string>()
    for (const item of invoice.items) {
      const key = itemKey(item.description)
      if (key === '' || seen.has(key)) continue
      seen.add(key)
      const fields = {
        description: item.description.trim(),
        rateSen: item.rateSen,
        quantity: item.quantity,
        lastUsedAt: now,
        lastInvoiceId: invoiceId,
      }
      const existing = await findByKey(ctx, userId, key)
      if (existing) {
        const useCount =
          existing.lastInvoiceId === invoiceId ? existing.useCount : existing.useCount + 1
        await ctx.db.patch(existing._id, { ...fields, useCount })
      } else {
        await ctx.db.insert('items', { userId, key, ...fields, useCount: 1 })
      }
    }
  },
})

/** Add an item by hand (from the Items page), ready to pick on any invoice. */
export const create = mutation({
  args: { description: v.string(), rateSen: v.number() },
  handler: async (ctx, { description, rateSen }) => {
    const userId = await requireUserId(ctx)
    const fields = { description: description.trim(), rateSen }
    checkItemFields(fields)
    const key = itemKey(fields.description)
    if (key === '') throw appError('invalid', 'description')
    if (await findByKey(ctx, userId, key)) throw appError('duplicate', 'description')
    return ctx.db.insert('items', {
      userId,
      key,
      ...fields,
      quantity: 1,
      useCount: 0,
      lastUsedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: { id: v.id('items'), description: v.string(), rateSen: v.number() },
  handler: async (ctx, { id, description, rateSen }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    const fields = { description: description.trim(), rateSen }
    checkItemFields(fields)
    const key = itemKey(fields.description)
    const clash = await findByKey(ctx, userId, key)
    if (clash && clash._id !== id) throw appError('duplicate', 'description')
    await ctx.db.patch(id, { ...fields, key })
  },
})

/** Stop suggesting an item. Invoices that used it are unaffected. */
export const remove = mutation({
  args: { id: v.id('items') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await ctx.db.delete(id)
  },
})
