import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from 'convex/react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, TextAreaField } from '@/components/ui/field'
import { errorMessage } from '@/lib/errors'

const clientSchema = z.object({
  name: z.string().trim().min(1, 'Enter the client’s name.').max(200),
  address: z.string().max(2000),
  attention: z.string().max(200),
  email: z.union([z.literal(''), z.email('Enter a valid email address.').max(200)]),
  notes: z.string().max(2000),
})
type ClientValues = z.infer<typeof clientSchema>

const EMPTY: ClientValues = { name: '', address: '', attention: '', email: '', notes: '' }

interface ClientDialogProps {
  /** `null` = closed, `'new'` = add, a client = edit. */
  client: Doc<'clients'> | 'new' | null
  onClose: () => void
}

export function ClientDialog({ client, onClose }: ClientDialogProps) {
  return (
    <Dialog
      open={client !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={client === 'new' ? 'New client' : 'Edit client'}
      description="Saved clients fill in the “Bill to” section for you."
    >
      {client !== null ? (
        <ClientForm key={client === 'new' ? 'new' : client._id} client={client} onDone={onClose} />
      ) : null}
    </Dialog>
  )
}

function ClientForm({ client, onDone }: { client: Doc<'clients'> | 'new'; onDone: () => void }) {
  const create = useMutation(api.clients.create)
  const update = useMutation(api.clients.update)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues:
      client === 'new'
        ? EMPTY
        : {
            name: client.name,
            address: client.address,
            attention: client.attention,
            email: client.email,
            notes: client.notes,
          },
  })

  const submit = handleSubmit(async (values) => {
    try {
      if (client === 'new') await create(values)
      else await update({ id: client._id, ...values })
      toast.success(client === 'new' ? 'Client added' : 'Client saved')
      onDone()
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save the client."))
    }
  })

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
      <Field label="Name" error={errors.name?.message} {...register('name')} />
      <TextAreaField
        label="Address"
        rows={4}
        error={errors.address?.message}
        {...register('address')}
      />
      <Field
        label="Attention (optional)"
        placeholder="e.g. Accounts Payable Department"
        error={errors.attention?.message}
        {...register('attention')}
      />
      <Field
        label="Email (optional)"
        type="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextAreaField
        label="Usual notes (optional)"
        hint="Added to new invoices for this client — e.g. vendor code, station name."
        rows={3}
        error={errors.notes?.message}
        {...register('notes')}
      />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {client === 'new' ? 'Add client' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
