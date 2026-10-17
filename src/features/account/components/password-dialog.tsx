import { api } from '@convex/_generated/api'
import { PASSWORD_MIN } from '@convex/lib/credentials'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'convex/react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { errorCode, errorMessage } from '@/lib/errors'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${String(PASSWORD_MIN)} characters.`)
    .max(128),
})
type PasswordValues = z.infer<typeof passwordSchema>

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const change = useAction(api.account.changePassword)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  })

  const close = () => {
    reset()
    onClose()
  }

  const submit = handleSubmit(async (values) => {
    try {
      await change(values)
      toast.success('Password changed. Other devices were logged out.')
      close()
    } catch (error) {
      if (errorCode(error) === 'wrong_password') {
        setError('currentPassword', { message: 'That password is not right.' })
      } else {
        toast.error(errorMessage(error, "Couldn't change the password."))
      }
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      title="Change password"
    >
      <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Change password
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
