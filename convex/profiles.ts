import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import {
  action,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import { requireUserId } from './lib/auth'
import { isIsoDate } from './lib/dates'
import { DEFAULT_PROFILE_DEFAULTS, EMPTY_BUSINESS, EMPTY_PAYMENT } from './lib/defaults'
import { firstInvoiceNumber } from './lib/numbering'
import { appError, checkBusiness, checkDefaults, checkNumber, checkPayment } from './lib/rules'
import { business, payment, profileDefaults } from './lib/validators'

const MAX_LOGO_BYTES = 1024 * 1024

/**
 * PNG, JPEG or WebP, judged by the file signature. No SVG: it can carry scripts if someone opens
 * the file URL directly.
 */
export function isSupportedImage(header: Uint8Array): boolean {
  const starts = (bytes: number[], offset = 0) => bytes.every((b, i) => header[offset + i] === b)
  const png = starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const jpeg = starts([0xff, 0xd8, 0xff])
  const webp = starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)
  return png || jpeg || webp
}

export async function findProfile(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<Doc<'profiles'> | null> {
  return ctx.db
    .query('profiles')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
}

/** The user's profile, created with empty details on first use. */
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
    business: EMPTY_BUSINESS,
    payment: EMPTY_PAYMENT,
    defaults: DEFAULT_PROFILE_DEFAULTS,
    nextNumber: firstInvoiceNumber(today),
  })
  const created = await ctx.db.get(id)
  if (!created) throw appError('not_found')
  return created
}

/** Details used on new invoices. `null` until the user saves something (UI shows defaults). */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    const profile = await findProfile(ctx, userId)
    if (!profile) return null
    const logoUrl = profile.logoId ? await ctx.storage.getUrl(profile.logoId) : null
    return {
      business: profile.business,
      payment: profile.payment,
      defaults: profile.defaults,
      nextNumber: profile.nextNumber,
      logoUrl,
    }
  },
})

export const update = mutation({
  args: {
    today: v.string(),
    business: v.optional(business),
    payment: v.optional(payment),
    defaults: v.optional(profileDefaults),
    nextNumber: v.optional(v.string()),
  },
  handler: async (ctx, { today, ...patch }) => {
    const userId = await requireUserId(ctx)
    if (patch.business) checkBusiness(patch.business, 'business')
    if (patch.payment) checkPayment(patch.payment)
    if (patch.defaults) checkDefaults(patch.defaults)
    if (patch.nextNumber !== undefined) checkNumber(patch.nextNumber, 'nextNumber')
    const profile = await ensureProfile(ctx, userId, today)
    await ctx.db.patch(profile._id, patch)
  },
})

export const generateLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx)
    return ctx.storage.generateUploadUrl()
  },
})

/**
 * Attach an uploaded image as the logo. The file's first bytes decide whether it is really a
 * PNG, JPEG or WebP (the browser's claimed type can't be trusted); anything else, or anything
 * over 1 MB, is deleted.
 */
export const setLogo = action({
  args: { storageId: v.id('_storage'), today: v.string() },
  handler: async (ctx, { storageId, today }) => {
    const userId = await requireUserId(ctx)
    const blob = await ctx.storage.get(storageId)
    if (!blob) throw appError('not_found')
    const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer())
    if (blob.size > MAX_LOGO_BYTES || !isSupportedImage(header)) {
      await ctx.storage.delete(storageId)
      throw appError('invalid', 'logo')
    }
    await ctx.runMutation(internal.profiles.attachLogo, { userId, storageId, today })
  },
})

export const attachLogo = internalMutation({
  args: { userId: v.id('users'), storageId: v.id('_storage'), today: v.string() },
  handler: async (ctx, { userId, storageId, today }) => {
    const profile = await ensureProfile(ctx, userId, today)
    if (profile.logoId && profile.logoId !== storageId) await ctx.storage.delete(profile.logoId)
    await ctx.db.patch(profile._id, { logoId: storageId })
  },
})

export const removeLogo = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    const profile = await findProfile(ctx, userId)
    if (!profile?.logoId) return
    await ctx.storage.delete(profile.logoId)
    await ctx.db.patch(profile._id, { logoId: undefined })
  },
})
