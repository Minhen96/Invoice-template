import { useAuthActions } from '@convex-dev/auth/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

import { emailSchema, resetSchema, type EmailValues, type ResetValues } from '../schemas'

import { AuthHeading } from './auth-layout'

/** Forgot password: email → 6-digit code + new password → signed in. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState<string | null>(null)
  return email === null ? (
    <RequestStep onSent={setEmail} />
  ) : (
    <ResetStep email={email} onBack={() => setEmail(null)} />
  )
}

function RequestStep({ onSent }: { onSent: (email: string) => void }) {
  const { signIn } = useAuthActions()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } })

  const submit = handleSubmit(async ({ email }) => {
    try {
      await signIn('password', { email, flow: 'reset' })
    } catch {
      // Move on regardless, so this page never reveals whether an email has an account.
    }
    onSent(email.trim().toLowerCase())
  })

  return (
    <>
      <AuthHeading
        title="Reset your password"
        subtitle="Enter your email and we'll send you a 6-digit code."
      />
      <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Send code
        </Button>
      </form>
      <p className="m-0 mt-6 text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-text underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </>
  )
}

function ResetStep({ email, onBack }: { email: string; onBack: () => void }) {
  const { signIn } = useAuthActions()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', newPassword: '' },
  })

  const submit = handleSubmit(async ({ code, newPassword }) => {
    try {
      await signIn('password', { email, code, newPassword, flow: 'reset-verification' })
    } catch {
      setError('code', { message: 'That code is wrong or has expired.' })
    }
  })

  return (
    <>
      <AuthHeading
        title="Choose a new password"
        subtitle={
          <>
            If <span className="font-medium text-text">{email}</span> has an account, a code is on
            its way.
          </>
        }
      />
      <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
        <Field
          label="Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="text-center text-lg tracking-[0.4em]"
          error={errors.code?.message}
          {...register('code')}
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Save and log in
        </Button>
        <Button variant="link" size="sm" onClick={onBack} className="self-center">
          Use another email
        </Button>
      </form>
    </>
  )
}
