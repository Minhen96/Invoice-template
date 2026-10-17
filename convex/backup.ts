import { query } from './_generated/server'
import { requireUserId } from './lib/auth'
import { listOwn } from './lib/defaultable'
import { findProfile } from './profiles'

/**
 * Everything the user owns, for "Download backup". Internal ids and owner fields are left out:
 * the file is for keeping, not for re-importing into another account.
 */
export const exportData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    const profile = await findProfile(ctx, userId)
    const clients = await ctx.db
      .query('clients')
      .withIndex('by_user_name', (q) => q.eq('userId', userId))
      .collect()
    const invoices = await ctx.db
      .query('invoices')
      .withIndex('by_user_issue', (q) => q.eq('userId', userId))
      .collect()
    const templates = await ctx.db
      .query('templates')
      .withIndex('by_user_name', (q) => q.eq('userId', userId))
      .collect()
    const items = await ctx.db
      .query('items')
      .withIndex('by_user_used', (q) => q.eq('userId', userId))
      .collect()
    return {
      version: 4,
      businesses: (await listOwn(ctx, userId, 'businesses')).map(
        ({ _id, _creationTime, userId: _owner, ...row }) => row,
      ),
      bankAccounts: (await listOwn(ctx, userId, 'bankAccounts')).map(
        ({ _id, _creationTime, userId: _owner, ...row }) => row,
      ),
      nextNumber: profile?.nextNumber ?? null,
      templates: templates.map(
        ({
          _id,
          _creationTime,
          userId: _owner,
          logoId: _logo,
          businessId: _business,
          bankAccountId: _bank,
          ...template
        }) => template,
      ),
      items: items.map(({ description, rateSen, quantity, useCount }) => ({
        description,
        rateSen,
        quantity,
        useCount,
      })),
      clients: clients.map(({ _id, _creationTime, userId: _owner, ...client }) => client),
      invoices: invoices.map(
        ({
          _id,
          _creationTime,
          userId: _owner,
          clientId: _client,
          templateId: _template,
          logoId: _logo,
          ...invoice
        }) => invoice,
      ),
    }
  },
})
