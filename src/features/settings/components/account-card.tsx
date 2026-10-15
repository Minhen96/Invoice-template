import { api } from '@convex/_generated/api'
import { PASSWORD_MIN } from '@convex/lib/credentials'
import { useAuthActions } from '@convex-dev/auth/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction, useQuery } from 'convex/react'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { errorCode, errorMessage } from '@/lib/errors'

export function AccountCard() {
  const viewer = useQuery(api.account.viewer)
  const { signOut } = useAuthActions()
  const signOutOthers = useAction(api.account.signOutOtherDevices)
  const [changing, setChanging] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  return (
    <SectionCard title="Account" description={viewer?.email ?? ' '}>
      <div className="flex flex-col divide-y divide-line">
        {viewer?.hasPassword ? (
          <Row label="Password" detail="Change the password you log in with.">
            <Button variant="secondary" size="sm" onClick={() => setChanging(true)}>
              Change
            </Button>
          </Row>
        ) : null}
        <Row label="Other devices" detail="Log out everywhere except this device.">
          <Button
            variant="secondary"
            size="sm"
            loading={signingOut}
            onClick={() => {
              setSigningOut(true)
              signOutOthers()
                .then(() => toast.success('Other devices are logged out'))
                .catch((error: unknown) => toast.error(errorMessage(error)))
                .finally(() => setSigningOut(false))
            }}
          >
            Log out others
          </Button>
        </Row>
        <Row label="This device" detail="You stay logged in for 60 days while you use the app.">
          <Button variant="secondary" size="sm" onClick={() => void signOut()}>
            <LogOut /> Log out
          </Button>
        </Row>
      </div>
      <ChangePasswordDialog open={changing} onClose={() => setChanging(false)} />
    </SectionCard>
  )
}

function Row({
  label,
  detail,
  children,
}: {
  label: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[13px] text-muted">{detail}</div>
      </div>
      {children}
    </div>
  )
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${String(PASSWORD_MIN)} characters.`)
    .max(128),
})
type PasswordValues = z.infer<typeof passwordSchema>

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
