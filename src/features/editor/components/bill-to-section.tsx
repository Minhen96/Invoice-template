import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import type { InvoiceContent } from '@convex/lib/validators'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Field, SelectField, TextAreaField } from '@/components/ui/field'
import { errorMessage } from '@/lib/errors'

interface BillToSectionProps {
  draft: InvoiceContent
  clients: Doc<'clients'>[] | undefined
  onChange: (patch: Partial<InvoiceContent>) => void
  bare?: boolean
}

/**
 * Who the invoice is for. Pick a saved client to fill everything in (including their usual
 * notes, e.g. vendor code), or type a new one and save it for next time.
 */
export function BillToSection({ draft, clients, onChange, bare = false }: BillToSectionProps) {
  const createClient = useMutation(api.clients.create)
  const updateClient = useMutation(api.clients.update)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const linked = clients?.find((c) => c._id === draft.clientId)
  const { billTo } = draft

  const differsFromSaved =
    linked !== undefined &&
    (linked.name !== billTo.name.trim() ||
      linked.address !== billTo.address ||
      linked.attention !== billTo.attention)

  // A saved client shows as a short summary; the fields appear only for a new client, when the
  // details were changed for this invoice, or on "Edit for this invoice".
  const showFields = linked === undefined || differsFromSaved || editing

  function pick(id: string) {
    setEditing(false)
    if (id === '') {
      onChange({ clientId: undefined })
      return
    }
    const client = clients?.find((c) => c._id === id)
    if (!client) return
    onChange({
      clientId: client._id,
      billTo: { name: client.name, address: client.address, attention: client.attention },
      ...(client.notes !== '' ? { notes: client.notes } : {}),
    })
  }

  async function save() {
    setSaving(true)
    try {
      const fields = {
        name: billTo.name,
        address: billTo.address,
        attention: billTo.attention,
        email: linked?.email ?? '',
        notes: linked?.notes ?? draft.notes,
      }
      if (linked) {
        await updateClient({ id: linked._id, ...fields })
        toast.success('Client updated')
      } else {
        const id: Id<'clients'> = await createClient(fields)
        onChange({ clientId: id })
        toast.success('Saved to clients')
      }
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save the client."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      bare={bare}
      title="Bill to"
      action={
        billTo.name.trim() !== '' && (linked === undefined || differsFromSaved) ? (
          <Button variant="secondary" size="sm" loading={saving} onClick={() => void save()}>
            {linked ? 'Update client' : 'Save as client'}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        {clients && clients.length > 0 ? (
          <SelectField
            label="Client"
            value={linked?._id ?? ''}
            onChange={(e) => {
              pick(e.target.value)
            }}
          >
            <option value="">New client</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </SelectField>
        ) : null}
        {showFields ? (
          <BillToFields billTo={billTo} onChange={(next) => onChange({ billTo: next })} />
        ) : (
          <div className="flex items-start justify-between gap-3 rounded-xl bg-raised p-4 text-sm">
            <div className="min-w-0 text-muted">
              {billTo.address ? <p className="m-0 whitespace-pre-line">{billTo.address}</p> : null}
              {billTo.attention ? <p className="m-0 mt-1">Attention: {billTo.attention}</p> : null}
              {!billTo.address && !billTo.attention ? (
                <p className="m-0">No address saved</p>
              ) : null}
            </div>
            <Button variant="link" size="sm" onClick={() => setEditing(true)} className="shrink-0">
              Edit for this invoice
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function BillToFields({
  billTo,
  onChange,
}: {
  billTo: InvoiceContent['billTo']
  onChange: (billTo: InvoiceContent['billTo']) => void
}) {
  return (
    <>
      <Field
        label="Name"
        value={billTo.name}
        maxLength={200}
        placeholder="Company or person"
        onChange={(e) => onChange({ ...billTo, name: e.target.value })}
      />
      <TextAreaField
        label="Address"
        value={billTo.address}
        maxLength={2000}
        rows={4}
        onChange={(e) => onChange({ ...billTo, address: e.target.value })}
      />
      <Field
        label="Attention (optional)"
        value={billTo.attention}
        maxLength={200}
        placeholder="e.g. Accounts Payable Department"
        onChange={(e) => onChange({ ...billTo, attention: e.target.value })}
      />
    </>
  )
}
