import { getAuthUserId } from '@convex-dev/auth/server'

import type { Doc, Id, TableNames } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { appError } from './rules'

type OwnedTable = Extract<TableNames, 'profiles' | 'clients' | 'invoices'>

/** The signed-in user's id, or an `unauthorized` error. Every public function starts here. */
export async function requireUserId(ctx: Pick<QueryCtx, 'auth'>): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx)
  if (userId === null) throw appError('unauthorized')
  return userId
}

/**
 * Load a document only if it belongs to `userId`. Someone else's id and a deleted id look the
 * same (`not_found`), so ids can't be used to probe other accounts.
 */
export async function getOwned<T extends OwnedTable>(
  ctx: QueryCtx,
  userId: Id<'users'>,
  id: Id<T>,
): Promise<Doc<T>> {
  const doc = await ctx.db.get(id)
  if (doc?.userId !== userId) throw appError('not_found')
  return doc
}
