import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { formatSen } from '@convex/lib/money'
import { useMutation, useQuery } from 'convex/react'
import { FilePlus2, MoreHorizontal, PenLine, Plus, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ClientDialog } from '@/components/shared/client-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Menu } from '@/components/ui/menu'
import { SearchField } from '@/components/ui/search-field'
import { Skeleton } from '@/components/ui/skeleton'
import { useNewInvoice } from '@/hooks/new-invoice-context'
import { errorMessage } from '@/lib/errors'

interface ClientTotals {
  count: number
  /** Unpaid amount per currency. */
  unpaid: Record<string, number>
}

export function ClientsPage() {
  const clients = useQuery(api.clients.list)
  const invoices = useQuery(api.invoices.list)
  const newInvoice = useNewInvoice()
  const [editing, setEditing] = useState<Doc<'clients'> | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Doc<'clients'> | null>(null)
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const words = query.trim().toLowerCase()
    if (words === '') return clients ?? []
    return (clients ?? []).filter((client) =>
      [client.name, client.address, client.attention, client.email].some((field) =>
        field.toLowerCase().includes(words),
      ),
    )
  }, [clients, query])

  const totals = useMemo(() => {
    const map = new Map<string, ClientTotals>()
    for (const invoice of invoices ?? []) {
      if (!invoice.clientId) continue
      const entry = map.get(invoice.clientId) ?? { count: 0, unpaid: {} }
      entry.count++
      if (invoice.status === 'unpaid') {
        entry.unpaid[invoice.currency] = (entry.unpaid[invoice.currency] ?? 0) + invoice.totalSen
      }
      map.set(invoice.clientId, entry)
    }
    return map
  }, [invoices])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="m-0 mt-1 text-sm text-muted">People and companies you bill.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing('new')}>
          <Plus /> Add client
        </Button>
      </div>

      {clients === undefined ? (
        <div
          role="status"
          aria-label="Loading clients"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-sunken">
            <Users aria-hidden="true" className="size-5 text-muted" />
          </span>
          <div>
            <p className="m-0 font-medium">No clients yet.</p>
            <p className="m-0 mt-1 text-sm text-muted">
              Save a client once and their details fill in every invoice.
            </p>
          </div>
          <Button className="mt-2" onClick={() => setEditing('new')}>
            <Plus /> Add client
          </Button>
        </Card>
      ) : (
        <>
          <SearchField
            label="Search clients"
            value={query}
            placeholder="Search name, address, email"
            onChange={setQuery}
          />
          {shown.length === 0 ? (
            <Card className="px-6 py-12 text-center text-sm text-muted">No clients match.</Card>
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((client) => {
                const info = totals.get(client._id)
                const unpaid = Object.entries(info?.unpaid ?? {}).filter(([, sen]) => sen > 0)
                return (
                  <li key={client._id}>
                    <Card className="flex h-full flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="m-0 truncate text-[15px] font-semibold">{client.name}</h2>
                          {client.attention ? (
                            <p className="m-0 mt-0.5 truncate text-[13px] text-muted">
                              Attn: {client.attention}
                            </p>
                          ) : null}
                        </div>
                        <Menu
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${client.name}`}
                              className="-mt-1 -mr-2"
                            >
                              <MoreHorizontal />
                            </Button>
                          }
                          items={[
                            {
                              label: 'Edit',
                              icon: <PenLine />,
                              onSelect: () => setEditing(client),
                            },
                            'separator',
                            {
                              label: 'Delete',
                              icon: <Trash2 />,
                              danger: true,
                              onSelect: () => setDeleting(client),
                            },
                          ]}
                        />
                      </div>
                      {client.address ? (
                        <p className="m-0 line-clamp-3 text-[13px] whitespace-pre-line text-muted">
                          {client.address}
                        </p>
                      ) : null}
                      <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
                        <div className="text-[13px]">
                          <div className="text-muted">
                            {info?.count ?? 0} invoice{info?.count === 1 ? '' : 's'}
                          </div>
                          <div className="font-medium tabular">
                            {unpaid.length === 0
                              ? 'Nothing owed'
                              : `${unpaid.map(([cur, sen]) => `${cur} ${formatSen(sen)}`).join(' · ')} unpaid`}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => newInvoice({ clientId: client._id })}
                        >
                          <FilePlus2 /> Invoice
                        </Button>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <ClientDialog client={editing} onClose={() => setEditing(null)} />
      <DeleteClientDialog client={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}

function DeleteClientDialog({
  client,
  onClose,
}: {
  client: Doc<'clients'> | null
  onClose: () => void
}) {
  const remove = useMutation(api.clients.remove)
  const [pending, setPending] = useState(false)

  async function confirm() {
    if (!client) return
    setPending(true)
    try {
      await remove({ id: client._id })
      toast.success('Client deleted')
      onClose()
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete the client."))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={client !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={`Delete ${client?.name ?? 'client'}?`}
      description="Their invoices stay as they are."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={pending} onClick={() => void confirm()}>
            Delete client
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm text-muted">
        Only the saved client is removed. Invoices already made for them keep their details.
      </p>
    </Dialog>
  )
}
