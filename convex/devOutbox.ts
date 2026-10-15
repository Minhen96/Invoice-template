import { v } from 'convex/values'

import { internalMutation, internalQuery } from './_generated/server'

/**
 * Local-testing stand-in for an inbox (like Mailpit in the stock app). Only written when
 * AUTH_DEV_OUTBOX=true and no Resend key is set; read by end-to-end tests through
 * `npx convex run devOutbox:latest`. Internal functions: never callable from the browser.
 */

export const record = internalMutation({
  args: { email: v.string(), code: v.string(), purpose: v.string() },
  handler: async (ctx, args) => {
    if (process.env.AUTH_DEV_OUTBOX !== 'true') throw new Error('Dev outbox is disabled')
    await ctx.db.insert('devOutbox', { ...args, email: args.email.trim().toLowerCase() })
  },
})

export const latest = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const row = await ctx.db
      .query('devOutbox')
      .withIndex('by_email', (q) => q.eq('email', email.trim().toLowerCase()))
      .order('desc')
      .first()
    return row ? { code: row.code, purpose: row.purpose } : null
  },
})
