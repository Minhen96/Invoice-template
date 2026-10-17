import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { EMPTY_BUSINESS, EMPTY_PAYMENT } from '@convex/lib/defaults'
import type { Business, Payment } from '@convex/lib/validators'
import { useMutation } from 'convex/react'
import { Trash2 } from 'lucide-react'
import { useState, type ReactNode, type SyntheticEvent } from 'react'
import { toast } from 'sonner'

import { BusinessFields, PaymentFields } from '@/components/shared/party-fields'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { errorMessage } from '@/lib/errors'
import { asBusiness, asPayment } from '@/lib/parties'
import { today } from '@/lib/today'

interface EditFormProps<T> {
  saved: T
  onSave: (value: T, makeDefault: boolean) => Promise<unknown>
  onClose: () => void
  successMessage: string
  /** Offer "Use as default" (for an item that isn't the default yet). */
  offerDefault?: boolean
  /** Shows a Delete button (for existing items). */
  onDelete?: () => Promise<unknown>
  children: (value: T, setValue: (value: T) => void) => ReactNode
}

/** Popup form body. Mounted per opening, so it always starts from the saved value. */
function EditForm<T>({
  saved,
  onSave,
  onClose,
  successMessage,
  offerDefault = false,
  onDelete,
  children,
}: EditFormProps<T>) {
  const [value, setValue] = useState(saved)
  const [makeDefault, setMakeDefault] = useState(false)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)

  async function run(kind: 'save' | 'delete', action: () => Promise<unknown>, done: string) {
    setBusy(kind)
    try {
      await action()
      toast.success(done)
      onClose()
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save. Please try again."))
    } finally {
      setBusy(null)
    }
  }

  function submit(event: SyntheticEvent) {
    event.preventDefault()
    void run('save', () => onSave(value, makeDefault), successMessage)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {children(value, setValue)}
      {offerDefault ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={makeDefault}
            onChange={(e) => setMakeDefault(e.target.checked)}
            className="size-5 accent-ink"
          />
          Use as default
        </label>
      ) : null}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center">
        {onDelete ? (
          <Button
            variant="ghost"
            loading={busy === 'delete'}
            onClick={() => void run('delete', onDelete, 'Deleted')}
            className="text-danger hover:bg-danger-bg hover:text-danger sm:mr-auto"
          >
            {busy === 'delete' ? null : <Trash2 />} Delete
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onClose} className="sm:ml-auto">
          Cancel
        </Button>
        <Button type="submit" loading={busy === 'save'}>
          Save
        </Button>
      </div>
    </form>
  )
}

function Popup({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={title}
      description={description}
      className="sm:max-w-lg"
    >
      {open ? children : null}
    </Dialog>
  )
}

/** What a list popup is showing: a new one, an existing one, or nothing (closed). */
export type Target<T> = T | 'new' | null

export function BusinessDialog({
  target,
  onClose,
  onCreated,
}: {
  target: Target<Doc<'businesses'>>
  onClose: () => void
  /** Called with the new one's id after adding. */
  onCreated?: (id: Id<'businesses'>) => void
}) {
  const create = useMutation(api.businesses.create)
  const update = useMutation(api.businesses.update)
  const setDefault = useMutation(api.businesses.setDefault)
  const remove = useMutation(api.businesses.remove)
  const existing = target !== 'new' && target !== null ? target : null

  return (
    <Popup
      open={target !== null}
      onClose={onClose}
      title={existing ? 'Edit business' : 'Add business'}
      description="Shown as “From” on invoices."
    >
      <EditForm<Business>
        saved={existing ? asBusiness(existing) : EMPTY_BUSINESS}
        successMessage="Business saved"
        offerDefault={!existing?.isDefault}
        onClose={onClose}
        onSave={async (value, makeDefault) => {
          if (!existing) {
            const id = await create({ ...value, makeDefault })
            onCreated?.(id)
            return
          }
          await update({ id: existing._id, ...value })
          if (makeDefault) await setDefault({ id: existing._id })
        }}
        {...(existing ? { onDelete: () => remove({ id: existing._id }) } : {})}
      >
        {(value, setValue) => <BusinessFields value={value} onChange={setValue} />}
      </EditForm>
    </Popup>
  )
}

export function BankAccountDialog({
  target,
  onClose,
  onCreated,
}: {
  target: Target<Doc<'bankAccounts'>>
  onClose: () => void
  /** Called with the new one's id after adding. */
  onCreated?: (id: Id<'bankAccounts'>) => void
}) {
  const create = useMutation(api.bankAccounts.create)
  const update = useMutation(api.bankAccounts.update)
  const setDefault = useMutation(api.bankAccounts.setDefault)
  const remove = useMutation(api.bankAccounts.remove)
  const existing = target !== 'new' && target !== null ? target : null

  return (
    <Popup
      open={target !== null}
      onClose={onClose}
      title={existing ? 'Edit bank account' : 'Add bank account'}
      description="Where clients pay you. Shown on invoices."
    >
      <EditForm<Payment>
        saved={existing ? asPayment(existing) : EMPTY_PAYMENT}
        successMessage="Bank account saved"
        offerDefault={!existing?.isDefault}
        onClose={onClose}
        onSave={async (value, makeDefault) => {
          if (!existing) {
            const id = await create({ ...value, makeDefault })
            onCreated?.(id)
            return
          }
          await update({ id: existing._id, ...value })
          if (makeDefault) await setDefault({ id: existing._id })
        }}
        {...(existing ? { onDelete: () => remove({ id: existing._id }) } : {})}
      >
        {(value, setValue) => <PaymentFields value={value} onChange={setValue} />}
      </EditForm>
    </Popup>
  )
}

export function NumberingDialog({
  open,
  onClose,
  nextNumber,
}: {
  open: boolean
  onClose: () => void
  nextNumber: string
}) {
  const update = useMutation(api.profiles.update)
  return (
    <Popup
      open={open}
      onClose={onClose}
      title="Invoice numbers"
      description="The number your next invoice gets."
    >
      <EditForm<string>
        saved={nextNumber}
        successMessage="Next number saved"
        onClose={onClose}
        onSave={(value) => update({ today: today(), nextNumber: value })}
      >
        {(value, setValue) => (
          <Field
            label="Next invoice number"
            hint="Counts up by itself, keeping your format (2026031 → 2026032, INV-009 → INV-010)."
            value={value}
            maxLength={50}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
      </EditForm>
    </Popup>
  )
}
