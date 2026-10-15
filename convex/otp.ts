import { Email } from '@convex-dev/auth/providers/Email'
import type { EmailConfig } from '@convex-dev/auth/server'

import { internal } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import { renderCodeEmail, type CodePurpose } from './lib/email'

function isActionCtx(value: unknown): value is ActionCtx {
  return typeof value === 'object' && value !== null && 'runMutation' in value
}

/**
 * One-time 6-digit codes for "verify your email" and "reset your password". Sent with Resend
 * (https://resend.com). With AUTH_DEV_OUTBOX=true and no Resend key, codes are written to the
 * devOutbox table instead, for local testing only.
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

function codeProvider(id: string, purpose: CodePurpose): EmailConfig {
  return Email({
    id,
    maxAge: CODE_TTL_SECONDS,
    generateVerificationToken: () => Promise.resolve(generateCode()),
    // Convex Auth passes the action ctx as a second argument, but Auth.js' type doesn't declare it.
    async sendVerificationRequest({ identifier: email, token }, ...rest: unknown[]) {
      if (!process.env.AUTH_RESEND_KEY && process.env.AUTH_DEV_OUTBOX === 'true') {
        const ctx = rest[0]
        if (!isActionCtx(ctx)) throw new Error('Convex Auth did not pass an action context')
        await ctx.runMutation(internal.devOutbox.record, { email, code: token, purpose })
        return
      }
      await sendWithResend(email, purpose, token)
    },
  })
}

export const VerifyEmailCode = codeProvider('verify-code', 'verify')
export const ResetPasswordCode = codeProvider('reset-code', 'reset')
