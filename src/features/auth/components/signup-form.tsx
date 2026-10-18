import { useAuthActions } from '@convex-dev/auth/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { errorCode } from '@/lib/errors'
import { safeRedirect } from '@/lib/safe-redirect'

import { signupSchema, type SignupValues } from '../schemas'

import { AuthHeading } from './auth-layout'
import { CodeStep } from './code-step'
import { GoogleButton } from './google-button'

/** Create an account: email + password, then confirm the email with a 6-digit code. */
export function SignupForm({ redirect }: { redirect?: string | undefined }) {
  const { signIn } = useAuthActions()
  // Kept after sign-up to verify the email (and resend the code).
  const [pending, setPending] = useState<{ email: string; password: string } | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const submit = handleSubmit(async ({ email, password }) => {
    try {
      const { signingIn } = await signIn('password', { email, password, flow: 'signUp' })
      if (!signingIn) setPending({ email, password })
    } catch (error) {
      if (errorCode(error) === 'weak_password') {
        setError('password', { message: 'Use at least 8 characters.' })
        return
      }
      setError('email', {
        message: "Couldn't create an account with this email. If you already have one, log in.",
      })
    }
  })

  if (pending) {
    return (
      <CodeStep
        email={pending.email}
        onSubmit={async (code) => {
          await signIn('password', { email: pending.email, code, flow: 'email-verification' })
        }}
        onResend={async () => {
          await signIn('password', { ...pending, flow: 'signIn' })
        }}
        onBack={() => setPending(null)}
      />
    )
  }

  return (
    <>
      <AuthHeading title="Create your account" subtitle="Free. Takes a minute." />
      <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Create account
        </Button>
      </form>
      <GoogleButton redirectTo={safeRedirect(redirect)} />
      <p className="m-0 mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link
          to="/login"
          search={redirect ? { redirect } : {}}
          className="font-medium text-text underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </>
  )
}
