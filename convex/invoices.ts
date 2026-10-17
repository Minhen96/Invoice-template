import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { getOwned, requireUserId } from './lib/auth'
import { addDays, addMonths, daysBetween, isIsoDate } from './lib/dates'
import { computeTotals } from './lib/invoiceMath'
import { shiftMonths } from './lib/monthShift'
import { nextInvoiceNumber } from './lib/numbering'
import { EMPTY_BUSINESS, EMPTY_PAYMENT } from './lib/defaults'
import { resolveOwn } from './lib/defaultable'
import { fitItemsToColumns } from './lib/templateSwitch'
import { appError, checkInvoice, LIMITS } from './lib/rules'
import {
  invoiceContentObject,
  invoiceStatus,
  lineItem,
  type InvoiceContent,
} from './lib/validators'
import { ensureProfile } from './profiles'

/** Safety stop for number allocation (someone would need 1,000 consecutive numbers taken). */
const MAX_NUMBER_ATTEMPTS = 1_000

function checkToday(today: string): void {
  if (!isIsoDate(today)) throw appError('invalid', 'today')
}

async function numberTaken(
  ctx: QueryCtx,
  userId: Id<'users'>,
  number: string,
  except?: Id<'invoices'>,
): Promise<boolean> {
  const matches = await ctx.db
    .query('invoices')
    .withIndex('by_user_number', (q) => q.eq('userId', userId).eq('number', number))
    .take(2)
  return matches.some((doc) => doc._id !== except)
}

/**
 * Take the profile's suggested number (skipping any already used) and advance the suggestion.
 * Runs inside the calling mutation's transaction, so two tabs can never get the same number.
 */
async function allocateNumber(ctx: MutationCtx, profile: Doc<'profiles'>): Promise<string> {
  let candidate = profile.nextNumber
  for (let i = 0; i < MAX_NUMBER_ATTEMPTS; i++) {
    if (!(await numberTaken(ctx, profile.userId, candidate))) {
      await ctx.db.patch(profile._id, { nextNumber: nextInvoiceNumber(candidate) })
      return candidate
    }
    candidate = nextInvoiceNumber(candidate)
  }
  throw appError('number_taken', 'number')
}

function newItemId(): string {
  return crypto.randomUUID()
}

function withTotal(content: InvoiceContent): InvoiceContent & { totalSen: number } {
  return { ...content, totalSen: computeTotals(content).totalSen }
}

/** Newest first. Light rows for lists and dashboard totals. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    const rows = await ctx.db
      .query('invoices')
      .withIndex('by_user_issue', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
    // Whole invoices: the list draws a small preview of each one.
    return Promise.all(
      rows.map(async ({ userId: _owner, ...row }) => ({
        ...row,
        name: row.name ?? '',
        clientName: row.billTo.name,
        logoUrl: row.logoId ? await ctx.storage.getUrl(row.logoId) : null,
      })),
    )
  },
})

/**
 * Full invoice, or null when it doesn't exist or isn't yours. Takes any string, because the id
 * comes from the URL: a mangled link shows "not found" rather than an error.
 */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const id = ctx.db.normalizeId('invoices', args.id)
    if (id === null) return null
    const invoice = await ctx.db.get(id)
    if (invoice?.userId !== userId) return null
    const logoUrl = invoice.logoId ? await ctx.storage.getUrl(invoice.logoId) : null
    return { ...invoice, logoUrl }
  },
})

/** The parts of an invoice that come from its template. */
function fromTemplate(template: Doc<'templates'>) {
  return {
    title: template.title,
    layout: template.layout,
    accent: template.accent,
    currency: template.currency,
    dateFormat: template.dateFormat,
    columns: template.columns,
  }
}

/** Business / bank details without the row's own fields (id, owner, default flag). */
function stripRow<
  T extends { _id: unknown; _creationTime: number; userId: unknown; isDefault: boolean },
>(row: T | null): Omit<T, '_id' | '_creationTime' | 'userId' | 'isDefault'> | null {
  if (!row) return null
  const { _id, _creationTime, userId, isDefault, ...fields } = row
  return fields
}

/**
 * New invoice from a template (look, columns, terms), the business and bank account the template
 * uses (or the defaults), and optionally a saved client.
 * Remembers both, so the "New invoice" popup pre-picks them next time.
 */
export const create = mutation({
  args: {
    today: v.string(),
    templateId: v.id('templates'),
    clientId: v.optional(v.id('clients')),
    /** Chosen in the New invoice popup; otherwise the template's (or the default). */
    businessId: v.optional(v.id('businesses')),
    bankAccountId: v.optional(v.id('bankAccounts')),
    /** Defaults to today. */
    issueDate: v.optional(v.string()),
    /** '' = no due date; otherwise the template's payment terms decide. */
    dueDate: v.optional(v.string()),
    name: v.optional(v.string()),
    /** Filled in the popup; otherwise the invoice starts with none and the usual notes. */
    items: v.optional(v.array(lineItem)),
    notes: v.optional(v.string()),
    discountSen: v.optional(v.number()),
    taxRateBps: v.optional(v.number()),
    taxLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { today, templateId, clientId, businessId, bankAccountId } = args
    const userId = await requireUserId(ctx)
    checkToday(today)
    const issueDate = args.issueDate ?? today
    if (!isIsoDate(issueDate)) throw appError('invalid', 'issueDate')
    const template = await getOwned(ctx, userId, templateId)
    const client = clientId ? await getOwned(ctx, userId, clientId) : null
    const business = businessId
      ? await getOwned(ctx, userId, businessId)
      : await resolveOwn(ctx, userId, 'businesses', template.businessId)
    const bank = bankAccountId
      ? await getOwned(ctx, userId, bankAccountId)
      : await resolveOwn(ctx, userId, 'bankAccounts', template.bankAccountId)
    const profile = await ensureProfile(ctx, userId, today)
    const number = await allocateNumber(ctx, profile)
    await ctx.db.patch(profile._id, { lastTemplateId: templateId, lastClientId: client?._id })
    const content: InvoiceContent = {
      ...fromTemplate(template),
      name: args.name?.trim() ?? '',
      number,
      issueDate,
      dueDate:
        args.dueDate ?? (template.dueDays === null ? '' : addDays(issueDate, template.dueDays)),
      from: stripRow(business) ?? EMPTY_BUSINESS,
      payment: stripRow(bank) ?? EMPTY_PAYMENT,
      clientId: client?._id,
      billTo: client
        ? { name: client.name, address: client.address, attention: client.attention }
        : { name: '', address: '', attention: '' },
      // None given: the editor shows "+ Add item" on the paper.
      items: fitItemsToColumns(args.items ?? [], template.columns),
      discountSen: args.discountSen ?? 0,
      taxRateBps: args.taxRateBps ?? 0,
      taxLabel: args.taxLabel ?? 'SST',
      notes: args.notes ?? (client && client.notes !== '' ? client.notes : template.notes),
      showPaidStamp: false,
    }
    checkInvoice(content)
    return ctx.db.insert('invoices', {
      userId,
      ...withTotal(content),
      templateId,
      logoId: template.logoId,
      status: 'unpaid',
      paidAt: '',
      paidNote: '',
    })
  },
})

/**
 * Save the editor's content (its Save button). `templateId` when the invoice was switched to
 * another template while editing (the content already carries that template's look).
 */
export const update = mutation({
  args: {
    id: v.id('invoices'),
    content: invoiceContentObject,
    templateId: v.optional(v.id('templates')),
  },
  handler: async (ctx, { id, content, templateId }) => {
    const userId = await requireUserId(ctx)
    const invoice = await getOwned(ctx, userId, id)
    const template = templateId ? await getOwned(ctx, userId, templateId) : null
    const tidy: InvoiceContent = {
      ...content,
      number: content.number.trim(),
      items: fitItemsToColumns(content.items, content.columns),
    }
    checkInvoice(tidy)
    if (tidy.clientId !== undefined) await getOwned(ctx, userId, tidy.clientId)
    if (tidy.number !== invoice.number && (await numberTaken(ctx, userId, tidy.number, id))) {
      throw appError('number_taken', 'number')
    }
    await ctx.db.patch(id, {
      ...withTotal(tidy),
      ...(template ? { templateId: template._id, logoId: template.logoId } : {}),
    })
  },
})

export const setStatus = mutation({
  args: {
    id: v.id('invoices'),
    status: invoiceStatus,
    paidAt: v.optional(v.string()),
    paidNote: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, paidAt = '', paidNote = '' }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    if (status === 'unpaid') {
      await ctx.db.patch(id, { status, paidAt: '', paidNote: '', showPaidStamp: false })
      return
    }
    if (!isIsoDate(paidAt)) throw appError('invalid', 'paidAt')
    if (paidNote.length > LIMITS.short) throw appError('invalid', 'paidNote')
    await ctx.db.patch(id, { status, paidAt, paidNote: paidNote.trim() })
  },
})

/**
 * Copy an invoice under the next free number, unpaid.
 * - plain copy: dated today, same payment terms.
 * - next month: dates move one month and months in item descriptions move too
 *   ("ANNOUNCER OCT 2026" → "ANNOUNCER NOV 2026").
 */
export const duplicate = mutation({
  args: { id: v.id('invoices'), today: v.string(), nextMonth: v.boolean() },
  handler: async (ctx, { id, today, nextMonth }) => {
    const userId = await requireUserId(ctx)
    checkToday(today)
    const source = await getOwned(ctx, userId, id)
    const profile = await ensureProfile(ctx, userId, today)
    const number = await allocateNumber(ctx, profile)

    const issueDate = nextMonth ? addMonths(source.issueDate, 1) : today
    let dueDate = ''
    if (source.dueDate !== '') {
      dueDate = nextMonth
        ? addMonths(source.dueDate, 1)
        : addDays(today, daysBetween(source.issueDate, source.dueDate))
    }
    const items = source.items.map((item) => ({
      ...item,
      id: newItemId(),
      description: nextMonth ? shiftMonths(item.description, 1) : item.description,
    }))

    const {
      _id,
      _creationTime,
      userId: _owner,
      status,
      paidAt,
      paidNote,
      totalSen,
      templateId,
      logoId,
      ...rest
    } = source
    const content: InvoiceContent = {
      ...rest,
      // "Astro – Oct 2026" → "Astro – Nov 2026", like the item descriptions.
      name: nextMonth && rest.name ? shiftMonths(rest.name, 1) : (rest.name ?? ''),
      number,
      issueDate,
      dueDate,
      items,
      showPaidStamp: false,
    }
    return ctx.db.insert('invoices', {
      userId,
      ...withTotal(content),
      templateId,
      logoId,
      status: 'unpaid',
      paidAt: '',
      paidNote: '',
    })
  },
})

export const remove = mutation({
  args: { id: v.id('invoices') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx)
    await getOwned(ctx, userId, id)
    await ctx.db.delete(id)
  },
})
