import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { isIsoDate } from '@convex/lib/dates'
import { useMutation } from 'convex/react'
import { useState, type SyntheticEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { errorMessage } from '@/lib/errors'
import { today } from '@/lib/today'

interface MarkPaidDialogProps {
  invoiceId: Id<'invoices'> | null
  /** Shown in the title, e.g. "2026031". */
  number: string
  onClose: () => void
}

/** Record a payment: the date it arrived (today by default) and an optional note. */
export function MarkPaidDialog({ invoiceId, number, onClose }: MarkPaidDialogProps) {
  const open = invoiceId !== null
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={`Mark ${number} as paid`}
      description="Record when the money arrived."
    >
      {/* Keyed so each opening starts fresh. */}
      {invoiceId ? <MarkPaidForm key={invoiceId} invoiceId={invoiceId} onDone={onClose} /> : null}
    </Dialog>
  )
}

function MarkPaidForm({ invoiceId, onDone }: { invoiceId: Id<'invoices'>; onDone: () => void }) {
  const setStatus = useMutation(api.invoices.setStatus)
  const [paidAt, setPaidAt] = useState(today)
  const [paidNote, setPaidNote] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function submit(event: SyntheticEvent) {
    event.preventDefault()
    if (!isIsoDate(paidAt)) {
      setError('Pick the date the payment arrived.')
      return
    }
    setSaving(true)
    try {
      await setStatus({ id: invoiceId, status: 'paid', paidAt, paidNote })
      toast.success('Marked as paid')
      onDone()
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't mark it as paid."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
      <Field
        label="Payment date"
        type="date"
        value={paidAt}
        max={today()}
        error={error}
        onChange={(e) => {
          setPaidAt(e.target.value)
          setError(undefined)
        }}
      />
      <Field
        label="Note (optional)"
        placeholder="e.g. Bank transfer, ref 123456"
        value={paidNote}
        maxLength={200}
        onChange={(e) => {
          setPaidNote(e.target.value)
        }}
      />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Mark as paid
        </Button>
      </div>
    </form>
  )
}
