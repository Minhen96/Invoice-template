import Google from '@auth/core/providers/google'
import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'

import type { DataModel } from './_generated/dataModel'
import { normaliseEmail, passwordProblem } from './lib/credentials'
import { ResetPasswordCode, VerifyEmailCode } from './otp'

const DAY_MS = 24 * 60 * 60 * 1000

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      // Email must be confirmed with a 6-digit code before the first sign-in.
      verify: VerifyEmailCode,
      // "Forgot password" sends a 6-digit code, then the new password is set with it.
      reset: ResetPasswordCode,
      profile(params) {
        const email = normaliseEmail(params.email)
        if (email === null) throw new ConvexError({ code: 'invalid', field: 'email' })
        return { email }
      },
      validatePasswordRequirements(password) {
        const problem = passwordProblem(password)
        if (problem !== null) throw new ConvexError({ code: 'weak_password', field: 'password' })
      },
    }),
    // Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET. A Google account with the same verified email
    // as a password account signs into that same account.
    Google,
  ],
  session: {
    // Like the stock app: stay signed in while you keep using it (60 days rolling)…
    inactiveDurationMs: 60 * DAY_MS,
    // …but sign in again at least once a year.
    totalDurationMs: 365 * DAY_MS,
  },
})
