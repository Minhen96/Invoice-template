import { z } from 'zod'

import { normaliseEmail, PASSWORD_MAX, PASSWORD_MIN } from '@convex/lib/credentials'

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email.')
  .refine((value) => normaliseEmail(value) !== null, 'Enter a valid email address.')

const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`)

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({ email, password: newPassword, confirmPassword: z.string() })
  .refine((values) => values.confirmPassword === values.password, {
    message: "The passwords don't match.",
    path: ['confirmPassword'],
  })
export type SignupValues = z.infer<typeof signupSchema>

export const emailSchema = z.object({ email })
export type EmailValues = z.infer<typeof emailSchema>

export const code = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from the email.')

export const codeSchema = z.object({ code })
export type CodeValues = z.infer<typeof codeSchema>

export const resetSchema = z.object({ code, newPassword })
export type ResetValues = z.infer<typeof resetSchema>
