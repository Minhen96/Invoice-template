import { v } from 'convex/values'

import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import {
  action,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import { getOwned, requireUserId } from './lib/auth'
import { DEFAULT_TEMPLATE } from './lib/defaults'
import { isSupportedImage, MAX_LOGO_BYTES } from './lib/logo'
import { appError, checkTemplate } from './lib/rules'
import { templateFields, templateFieldsObject, type TemplateFields } from './lib/validators'
import { findProfile } from './profiles'

function tidy(fields: TemplateFields): TemplateFields {
  return { ...fields, name: fields.name.trim() }
}

async function withLogoUrl(ctx: QueryCtx, template: Doc<'templates'>) {
  const logoUrl = template.logoId ? await ctx.storage.getUrl(template.logoId) : null
  return { ...template, logoUrl }
}

/**
 * Delete a logo file only when nothing of this user's still shows it (templates share a logo
 * after "Duplicate", and invoices keep the logo they were made with).
 */
async function deleteLogoIfUnused(ctx: MutationCtx, userId: Id<'users'>, logoId: Id<'_storage'>) {
  const templates = await ctx.db
    .query('templates')
    .withIndex('by_user_name', (q) => q.eq('userId', userId))
    .collect()
  if (templates.some((t) => t.logoId === logoId)) return
  const invoices = await ctx.db
    .query('invoices')
    .withIndex('by_user_issue', (q) => q.eq('userId', userId))
    .collect()
  if (invoices.some((i) => i.logoId === logoId)) return
  await ctx.storage.delete(logoId)
}

/** All templates, A→Z. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    const templates = await ctx.db
      .query('templates')
      .withIndex('by_user_name', (q) => q.eq('userId', userId))
      .collect()
    return Promise.all(templates.map((t) => withLogoUrl(ctx, t)))
  },
})

/** One template, or null when missing / not yours (the id comes from the URL). */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const id = ctx.db.normalizeId('templates', args.id)
    if (id === null) return null
    const template = await ctx.db.get(id)
    if (template?.userId !== userId) return null
    return withLogoUrl(ctx, template)
  },
})

/** New template; starts from sensible defaults unless fields are given. */
export const create = mutation({
  args: { fields: v.optional(templateFieldsObject) },
  handler: async (ctx, { fields }) => {
    const userId = await requireUserId(ctx)
    const values = tidy(fields ?? DEFAULT_TEMPLATE)
    checkTemplate(values)
    return ctx.db.insert('templates', { userId, ...values })
  },
})

export const update = mutation({
  args: {
    id: v.id('templates'),
    ...templateFields,
    /** Omit (or leave unset) to use the default business / bank account. */
    businessId: v.optional(v.id('businesses')),
    bankAccountId: v.optional(v.id('bankAccounts')),
  },
  handler: async (ctx, { id, businessId, bankAccountId, ...fields }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    if (businessId) await getOwned(ctx, userId, businessId)
    if (bankAccountId) await getOwned(ctx, userId, bankAccountId)
    const values = tidy(fields)
    checkTemplate(values)
    await ctx.db.patch(id, { ...values, businessId, bankAccountId })
  },
})

export const duplicate = mutation({
  args: { id: v.id('templates') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const { _id, _creationTime, userId: _owner, ...source } = await getOwned(ctx, userId, id)
    return ctx.db.insert('templates', {
      userId,
      ...source,
      name: `${source.name} (copy)`.slice(0, 60),
    })
  },
})

/** Invoices made from it keep their own copy of everything, so they are unaffected. */
export const remove = mutation({
  args: { id: v.id('templates') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const template = await getOwned(ctx, userId, id)
    await ctx.db.delete(id)
    if (template.logoId) await deleteLogoIfUnused(ctx, userId, template.logoId)
    const profile = await findProfile(ctx, userId)
    if (profile?.lastTemplateId === id)
      await ctx.db.patch(profile._id, { lastTemplateId: undefined })
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
 * Attach an uploaded image as the template's logo. The file's first bytes decide whether it is
 * really a PNG, JPEG or WebP; anything else, or anything over 1 MB, is deleted.
 */
export const setLogo = action({
  args: { id: v.id('templates'), storageId: v.id('_storage') },
  handler: async (ctx, { id, storageId }) => {
    const userId = await requireUserId(ctx)
    const blob = await ctx.storage.get(storageId)
    if (!blob) throw appError('not_found')
    const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer())
    if (blob.size > MAX_LOGO_BYTES || !isSupportedImage(header)) {
      await ctx.storage.delete(storageId)
      throw appError('invalid', 'logo')
    }
    await ctx.runMutation(internal.templates.attachLogo, { userId, id, storageId })
  },
})

export const attachLogo = internalMutation({
  args: { userId: v.id('users'), id: v.id('templates'), storageId: v.id('_storage') },
  handler: async (ctx, { userId, id, storageId }) => {
    const template = await getOwned(ctx, userId, id)
    await ctx.db.patch(id, { logoId: storageId })
    if (template.logoId && template.logoId !== storageId) {
      await deleteLogoIfUnused(ctx, userId, template.logoId)
    }
  },
})

export const removeLogo = mutation({
  args: { id: v.id('templates') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    const template = await getOwned(ctx, userId, id)
    if (!template.logoId) return
    await ctx.db.patch(id, { logoId: undefined })
    await deleteLogoIfUnused(ctx, userId, template.logoId)
  },
})
