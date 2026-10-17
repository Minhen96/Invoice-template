import { Email } from '@convex-dev/auth/providers/Email'
import type { EmailConfig } from '@convex-dev/auth/server'

import { internal } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import { renderCodeEmail, type CodePurpose } from './lib/email'

function isActionCtx(value: unknown): value is ActionCtx {
  return typeof value === 'object' && value !== null && 'runMutation' in value
}

/**
 * One-time 6-digit codes for "verify your email" and "reset your password".
 *
 * - Production: sent with Resend (https://resend.com) — whenever AUTH_RESEND_KEY is set.
 * - Local development, no Resend key:
 *   - AUTH_MAILPIT_URL (e.g. http://127.0.0.1:8025) delivers to a local Mailpit inbox;
 *   - AUTH_DEV_OUTBOX=true also stores the code in the devOutbox table (read by e2e tests).
 */

const CODE_TTL_SECONDS = 15 * 60

/** Uniform 6-digit code from the platform CSPRNG (rejection sampling avoids modulo bias). */
export function generateCode(): string {
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000
  const buffer = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buffer)
    const value = buffer[0] ?? limit
    if (value < limit) return String(value % 1_000_000).padStart(6, '0')
  }
}

async function sendWithResend(to: string, purpose: CodePurpose, code: string): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY
  if (!apiKey) throw new Error('AUTH_RESEND_KEY is not set')
  const from = process.env.AUTH_EMAIL_FROM ?? 'Invoice <onboarding@resend.dev>'
  const { subject, text, html } = renderCodeEmail(purpose, code)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  })
  if (!response.ok) {
    // Never log the address or the code; status is enough to diagnose.
    throw new Error(`Resend rejected the email (HTTP ${response.status})`)
  }
}

/** Mailpit's HTTP send API (https://mailpit.axllent.org/docs/api-v1/) — local inbox only. */
async function sendWithMailpit(
  baseUrl: string,
  to: string,
  purpose: CodePurpose,
  code: string,
): Promise<void> {
  const { subject, text, html } = renderCodeEmail(purpose, code)
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/v1/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      From: { Email: 'no-reply@invoices.local', Name: 'Invoices' },
      To: [{ Email: to }],
      Subject: subject,
      Text: text,
      HTML: html,
    }),
  })
  if (!response.ok) throw new Error(`Mailpit rejected the email (HTTP ${response.status})`)
}

function codeProvider(id: string, purpose: CodePurpose): EmailConfig {
  return Email({
    id,
    maxAge: CODE_TTL_SECONDS,
    generateVerificationToken: () => Promise.resolve(generateCode()),
    // Convex Auth passes the action ctx as a second argument, but Auth.js' type doesn't declare it.
    async sendVerificationRequest({ identifier: email, token }, ...rest: unknown[]) {
      if (process.env.AUTH_RESEND_KEY) {
        await sendWithResend(email, purpose, token)
        return
      }
      const mailpitUrl = process.env.AUTH_MAILPIT_URL
      const useOutbox = process.env.AUTH_DEV_OUTBOX === 'true'
      // Neither dev inbox configured: fail with the production setup hint.
      if (!mailpitUrl && !useOutbox) throw new Error('AUTH_RESEND_KEY is not set')
      if (useOutbox) {
        const ctx = rest[0]
        if (!isActionCtx(ctx)) throw new Error('Convex Auth did not pass an action context')
        await ctx.runMutation(internal.devOutbox.record, { email, code: token, purpose })
      }
      if (mailpitUrl) await sendWithMailpit(mailpitUrl, email, purpose, token)
    },
  })
}

export const VerifyEmailCode = codeProvider('verify-code', 'verify')
export const ResetPasswordCode = codeProvider('reset-code', 'reset')
