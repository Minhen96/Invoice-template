import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { getOwned, requireUserId } from './lib/auth'
import { addDays, addMonths, daysBetween, isIsoDate } from './lib/dates'
import { computeTotals } from './lib/invoiceMath'
import { shiftMonths } from './lib/monthShift'
import { nextInvoiceNumber } from './lib/numbering'
import { appError, checkInvoice, LIMITS } from './lib/rules'
import { invoiceContentObject, invoiceStatus, type InvoiceContent } from './lib/validators'
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
    return rows.map((row) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      number: row.number,
      title: row.title,
      clientId: row.clientId,
      clientName: row.billTo.name,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      currency: row.currency,
      totalSen: row.totalSen,
      status: row.status,
      paidAt: row.paidAt,
    }))
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
    return invoice
  },
})

/** New invoice from the profile's details (and the client's, when one is picked). */
export const create = mutation({
  args: { today: v.string(), clientId: v.optional(v.id('clients')) },
  handler: async (ctx, { today, clientId }) => {
    const userId = await requireUserId(ctx)
    checkToday(today)
    const client = clientId ? await getOwned(ctx, userId, clientId) : null
    const profile = await ensureProfile(ctx, userId, today)
    const { defaults } = profile
    const number = await allocateNumber(ctx, profile)
    const content: InvoiceContent = {
      number,
      title: defaults.title,
      template: defaults.template,
      accent: defaults.accent,
      currency: defaults.currency,
      dateFormat: defaults.dateFormat,
      issueDate: today,
      dueDate: defaults.dueDays === null ? '' : addDays(today, defaults.dueDays),
      clientId: client?._id,
      billTo: client
        ? { name: client.name, address: client.address, attention: client.attention }
        : { name: '', address: '', attention: '' },
      labels: defaults.labels,
      items: [{ id: newItemId(), description: '', rateSen: 0, quantity: 1 }],
      discountSen: 0,
      taxRateBps: 0,
      taxLabel: 'SST',
      notes: client && client.notes !== '' ? client.notes : defaults.notes,
      from: profile.business,
      payment: profile.payment,
      showPaidStamp: false,
    }
    return ctx.db.insert('invoices', {
      userId,
      ...withTotal(content),
      status: 'unpaid',
      paidAt: '',
      paidNote: '',
    })
  },
})

/** Save the editor's content (autosave). */
export const update = mutation({
  args: { id: v.id('invoices'), content: invoiceContentObject },
  handler: async (ctx, { id, content }) => {
    const userId = await requireUserId(ctx)
    const invoice = await getOwned(ctx, userId, id)
    const tidy: InvoiceContent = { ...content, number: content.number.trim() }
    checkInvoice(tidy)
    if (tidy.clientId !== undefined) await getOwned(ctx, userId, tidy.clientId)
    if (tidy.number !== invoice.number && (await numberTaken(ctx, userId, tidy.number, id))) {
      throw appError('number_taken', 'number')
    }
    await ctx.db.patch(id, withTotal(tidy))
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
      ...rest
    } = source
    const content: InvoiceContent = {
      ...rest,
      number,
      issueDate,
      dueDate,
      items,
      showPaidStamp: false,
    }
    return ctx.db.insert('invoices', {
      userId,
      ...withTotal(content),
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
