import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { errorMessage } from '@/lib/errors'
import { today } from '@/lib/today'

/** "New invoice": create it (optionally for a saved client) and open it in the editor. */
export function useCreateInvoice() {
  const create = useMutation(api.invoices.create)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  async function createInvoice(clientId?: Id<'clients'>) {
    setCreating(true)
    try {
      const id = await create(clientId ? { today: today(), clientId } : { today: today() })
      await navigate({ to: '/invoices/$id', params: { id } })
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't create the invoice."))
    } finally {
      setCreating(false)
    }
  }

  return { createInvoice, creating }
}
