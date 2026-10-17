import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import {
  business,
  clientFields,
  invoiceContent,
  invoiceStatus,
  payment,
  templateFields,
} from './lib/validators'

/**
 * Every app table carries `userId` and is read only through a `by_user…` index, so a query can
 * never return another account's rows (see lib/auth.ts).
 */
export default defineSchema({
  ...authTables,

  /** One per user: numbering, and what the "New invoice" popup should pre-pick. */
  profiles: defineTable({
    userId: v.id('users'),
    /** Suggested number for the next new invoice. */
    nextNumber: v.string(),
    lastTemplateId: v.optional(v.id('templates')),
    lastClientId: v.optional(v.id('clients')),
  }).index('by_user', ['userId']),

  /** Businesses you invoice as. One is the default. Copied onto each new invoice. */
  businesses: defineTable({
    userId: v.id('users'),
    ...business.fields,
    isDefault: v.boolean(),
  }).index('by_user', ['userId']),

  /** Where clients pay you. One is the default. Copied onto each new invoice. */
  bankAccounts: defineTable({
    userId: v.id('users'),
    ...payment.fields,
    isDefault: v.boolean(),
  }).index('by_user', ['userId']),

  /** Saved invoice templates (look, columns, terms). Copied onto each new invoice. */
  templates: defineTable({
    userId: v.id('users'),
    ...templateFields,
    /** Which business / bank account to use; unset (or deleted) = the default one. */
    businessId: v.optional(v.id('businesses')),
    bankAccountId: v.optional(v.id('bankAccounts')),
    logoId: v.optional(v.id('_storage')),
  }).index('by_user_name', ['userId', 'name']),

  /**
   * Items remembered from invoices, offered as suggestions. One row per description
   * (matched by `key`, see lib/itemKey.ts), keeping the latest price.
   */
  items: defineTable({
    userId: v.id('users'),
    key: v.string(),
    description: v.string(),
    rateSen: v.number(),
    quantity: v.number(),
    useCount: v.number(),
    lastUsedAt: v.number(),
    /** Last invoice it was remembered from (counts each invoice once). */
    lastInvoiceId: v.optional(v.id('invoices')),
  })
    .index('by_user_key', ['userId', 'key'])
    .index('by_user_used', ['userId', 'lastUsedAt']),

  clients: defineTable({
    userId: v.id('users'),
    ...clientFields,
  }).index('by_user_name', ['userId', 'name']),

  invoices: defineTable({
    userId: v.id('users'),
    ...invoiceContent,
    /** Template it was made from (set by the server; the template may since be deleted). */
    templateId: v.optional(v.id('templates')),
    /** Logo copied from the template (set by the server, never by the browser). */
    logoId: v.optional(v.id('_storage')),
    status: invoiceStatus,
    /** ISO date the payment arrived ('' when unpaid). */
    paidAt: v.string(),
    paidNote: v.string(),
    /** Stored so lists and totals don't recompute every invoice. Always derived from items. */
    totalSen: v.number(),
  })
    .index('by_user_issue', ['userId', 'issueDate'])
    .index('by_user_number', ['userId', 'number'])
    .index('by_user_client', ['userId', 'clientId']),

  /**
   * Development only: sign-in codes are written here instead of being emailed when
   * AUTH_DEV_OUTBOX=true (local testing without Resend). Never enabled in production.
   */
  devOutbox: defineTable({
    email: v.string(),
    code: v.string(),
    purpose: v.string(),
  }).index('by_email', ['email']),
})
