import { query } from './_generated/server'
import { requireUserId } from './lib/auth'
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
    return {
      version: 1,
      profile: profile
        ? {
            business: profile.business,
            payment: profile.payment,
            defaults: profile.defaults,
            nextNumber: profile.nextNumber,
          }
        : null,
      clients: clients.map(({ _id, _creationTime, userId: _owner, ...client }) => client),
      invoices: invoices.map(
        ({ _id, _creationTime, userId: _owner, clientId: _client, ...invoice }) => invoice,
      ),
    }
  },
})
