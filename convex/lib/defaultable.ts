import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/**
 * Businesses and bank accounts work the same way: a user has a list, and exactly one of them is
 * the default (whenever the list isn't empty). These helpers keep that true.
 */
export type DefaultableTable = 'businesses' | 'bankAccounts'
type Row<T extends DefaultableTable> = Doc<T>

export async function listOwn<T extends DefaultableTable>(
  ctx: QueryCtx,
  userId: Id<'users'>,
  table: T,
): Promise<Row<T>[]> {
  // One branch per table: Convex's index types don't work over a union of tables.
  const rows = (table === 'businesses'
    ? await ctx.db
        .query('businesses')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
    : await ctx.db
        .query('bankAccounts')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()) as unknown as Row<T>[]
  // Default first, then oldest first.
  return rows.sort(
    (a, b) => Number(b.isDefault) - Number(a.isDefault) || a._creationTime - b._creationTime,
  )
}

/** Make `id` the only default. */
export async function makeDefault<T extends DefaultableTable>(
  ctx: MutationCtx,
  userId: Id<'users'>,
  table: T,
  id: Id<T>,
): Promise<void> {
  for (const row of await listOwn(ctx, userId, table)) {
    const shouldBe = row._id === id
    if (row.isDefault !== shouldBe) await ctx.db.patch(row._id, { isDefault: shouldBe } as never)
  }
}

/** After a delete: if nothing is the default any more, the oldest remaining one becomes it. */
export async function ensureADefault(
  ctx: MutationCtx,
  userId: Id<'users'>,
  table: DefaultableTable,
): Promise<void> {
  const rows = await listOwn(ctx, userId, table)
  const first = rows[0]
  if (first && !rows.some((row) => row.isDefault)) {
    await ctx.db.patch(first._id, { isDefault: true } as never)
  }
}

/**
 * Which row an invoice should use: the chosen one if it still exists (and is yours), otherwise
 * the default, otherwise none.
 */
export async function resolveOwn<T extends DefaultableTable>(
  ctx: QueryCtx,
  userId: Id<'users'>,
  table: T,
  chosen: Id<T> | undefined,
): Promise<Row<T> | null> {
  if (chosen) {
    const row: Row<T> | null = await ctx.db.get(chosen)
    if (row?.userId === userId) return row
  }
  const rows = await listOwn(ctx, userId, table)
  return rows.find((row) => row.isDefault) ?? rows[0] ?? null
}
