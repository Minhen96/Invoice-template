import { api } from '@convex/_generated/api'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from 'convex/react'
import { Download } from 'lucide-react'
import { useState, type SyntheticEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { errorMessage } from '@/lib/errors'

interface DeleteAccountDialogProps {
  open: boolean
  /** The account's email; typed again to confirm. */
  email: string
  onClose: () => void
  /** Opens "Your data", to download a backup first. */
  onBackup: () => void
}

/** Delete the account and all its data, after typing the email to confirm. */
export function DeleteAccountDialog({ open, email, onClose, onBackup }: DeleteAccountDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Delete your account?"
      description="This can't be undone."
    >
      {open ? <DeleteForm email={email} onClose={onClose} onBackup={onBackup} /> : null}
    </Dialog>
  )
}

function DeleteForm({ email, onClose, onBackup }: Omit<DeleteAccountDialogProps, 'open'>) {
  const deleteAccount = useMutation(api.account.deleteAccount)
  const { signOut } = useAuthActions()
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const matches = email !== '' && typed.trim().toLowerCase() === email.toLowerCase()

  async function submit(event: SyntheticEvent) {
    event.preventDefault()
    if (!matches) return
    setDeleting(true)
    try {
      await deleteAccount({ confirmEmail: typed })
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete the account. Please try again."))
      setDeleting(false)
      return
    }
    toast.success('Your account and its data were deleted.')
    // The account is gone; clear this browser's sign-in too (the router then shows Log in).
    await signOut().catch(() => undefined)
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <p className="m-0 text-sm">
        Your invoices, clients, items, templates, logos, business and bank details are deleted for
        good, and you&apos;re signed out on every device.
      </p>
      <Button
        variant="secondary"
        className="self-start"
        onClick={() => {
          onClose()
          onBackup()
        }}
      >
        <Download /> Download a backup first
      </Button>
      <Field
        label={`Type ${email} to confirm`}
        autoComplete="off"
        spellCheck={false}
        value={typed}
        onChange={(e) => {
          setTyped(e.target.value)
        }}
      />
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" disabled={!matches} loading={deleting}>
          Delete forever
        </Button>
      </div>
    </form>
  )
}
