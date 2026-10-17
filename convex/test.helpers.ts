/// <reference types="vite/client" />
import { convexTest } from 'convex-test'

import { api } from './_generated/api'
import { DEFAULT_TEMPLATE } from './lib/defaults'
import type { TemplateFields } from './lib/validators'
import schema from './schema'

// Every Convex module, as the deployment sees it: no tests, helpers or type declarations.
export const modules = import.meta.glob([
  './**/*.ts',
  './**/*.js',
  '!./**/*.test.ts',
  '!./**/*.d.ts',
  '!./test.helpers.ts',
])

export const TODAY = '2026-10-15'

export function setupBackend() {
  return convexTest(schema, modules)
}

export type TestBackend = ReturnType<typeof setupBackend>

/** A signed-in user, as Convex Auth would identify them (`userId|sessionId`). */
export async function signedInUser(t: TestBackend, email = 'owner@example.com') {
  const { userId, sessionId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', { email })
    const sessionId = await ctx.db.insert('authSessions', {
      userId,
      expirationTime: Date.now() + 86_400_000,
    })
    return { userId, sessionId }
  })
  return { userId, as: t.withIdentity({ subject: `${userId}|${sessionId}` }) }
}

/** A template for `as`, starting from the defaults. */
export async function createTemplate(
  as: Awaited<ReturnType<typeof signedInUser>>['as'],
  fields: Partial<TemplateFields> = {},
) {
  return as.mutation(api.templates.create, { fields: { ...DEFAULT_TEMPLATE, ...fields } })
}
