import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import {
  business,
  clientFields,
  invoiceContent,
  invoiceStatus,
  payment,
  profileDefaults,
} from './lib/validators'

/**
 * Every app table carries `userId` and is read only through a `by_user…` index, so a query can
 * never return another account's rows (see lib/auth.ts).
 */
export default defineSchema({
  ...authTables,

  /** One per user: details copied into every new invoice. */
  profiles: defineTable({
    userId: v.id('users'),
    business,
    payment,
    defaults: profileDefaults,
    logoId: v.optional(v.id('_storage')),
    /** Suggested number for the next new invoice. */
    nextNumber: v.string(),
  }).index('by_user', ['userId']),

  clients: defineTable({
    userId: v.id('users'),
    ...clientFields,
  }).index('by_user_name', ['userId', 'name']),

  invoices: defineTable({
    userId: v.id('users'),
    ...invoiceContent,
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
