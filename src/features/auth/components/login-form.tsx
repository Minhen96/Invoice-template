import { useAuthActions } from '@convex-dev/auth/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { safeRedirect } from '@/lib/safe-redirect'

import { loginSchema, type LoginValues } from '../schemas'

import { AuthHeading } from './auth-layout'
import { CodeStep } from './code-step'
import { GoogleButton } from './google-button'

/**
 * Email + password log-in. An account whose email isn't confirmed yet gets a code by email
 * (Convex Auth sends it automatically) and confirms it right here.
 */
export function LoginForm({ redirect }: { redirect?: string | undefined }) {
  const { signIn } = useAuthActions()
  const [pending, setPending] = useState<LoginValues | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const submit = handleSubmit(async (values) => {
    try {
      const { signingIn } = await signIn('password', { ...values, flow: 'signIn' })
      // Not signed in yet = the email still needs its code.
      if (!signingIn) setPending(values)
    } catch {
      // Same answer for unknown email and wrong password (doesn't reveal who has an account).
      setError('password', { message: 'Wrong email or password.' })
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
      <AuthHeading title="Log in" subtitle="Welcome back." />
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
          autoComplete="current-password"
          error={errors.password?.message}
          labelAside={
            <Link
              to="/forgot-password"
              className="text-[13px] font-medium underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          }
          {...register('password')}
        />
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Log in
        </Button>
      </form>
      <GoogleButton redirectTo={safeRedirect(redirect)} />
      <p className="m-0 mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link
          to="/signup"
          search={redirect ? { redirect } : {}}
          className="font-medium text-text underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </>
  )
}
