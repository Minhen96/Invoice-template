import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

import { codeSchema, type CodeValues } from '../schemas'

import { AuthHeading } from './auth-layout'

interface CodeStepProps {
  email: string
  onSubmit: (code: string) => Promise<void>
  onResend: () => Promise<void>
  onBack: () => void
}

/** "We emailed you a 6-digit code" — used after sign-up and for unverified log-ins. */
export function CodeStep({ email, onSubmit, onResend, onBack }: CodeStepProps) {
  const [resending, setResending] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })

  const submit = handleSubmit(async ({ code }) => {
    try {
      await onSubmit(code)
    } catch {
      setError('code', { message: 'That code is wrong or has expired.' })
    }
  })

  async function resend() {
    setResending(true)
    try {
      await onResend()
      toast.success('We sent a new code.')
    } catch {
      toast.error("Couldn't send a new code. Please try again in a minute.")
    } finally {
      setResending(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
      <AuthHeading
        title="Check your email"
        subtitle={
          <>
            We sent a 6-digit code to <span className="font-medium text-text">{email}</span>.
          </>
        }
      />
      <Field
        label="Code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        className="text-center text-lg tracking-[0.4em]"
        error={errors.code?.message}
        {...register('code')}
      />
      <Button type="submit" loading={isSubmitting} className="w-full">
        Continue
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Button variant="link" size="sm" onClick={onBack}>
          Use another email
        </Button>
        <Button variant="link" size="sm" loading={resending} onClick={() => void resend()}>
          Send a new code
        </Button>
      </div>
    </form>
  )
}
