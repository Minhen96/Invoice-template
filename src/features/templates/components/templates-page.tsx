import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { LAYOUTS } from '@convex/lib/defaults'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Copy, LayoutTemplate, MoreHorizontal, PenLine, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { InvoiceDocument, PaperPreview, sampleInvoice } from '@/components/document'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Menu } from '@/components/ui/menu'
import { SearchField } from '@/components/ui/search-field'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/errors'
import { asBusiness, asPayment, pickRow } from '@/lib/parties'
import { today } from '@/lib/today'

import { DeleteTemplateDialog } from './delete-template-dialog'

export function TemplatesPage() {
  const templates = useQuery(api.templates.list)
  const businesses = useQuery(api.businesses.list)
  const banks = useQuery(api.bankAccounts.list)
  const create = useMutation(api.templates.create)
  const duplicate = useMutation(api.templates.duplicate)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<{ _id: Id<'templates'>; name: string } | null>(null)
  const [query, setQuery] = useState('')
  const words = query.trim().toLowerCase()
  const shown = (templates ?? []).filter((template) => {
    if (words === '') return true
    const layout = LAYOUTS.find((option) => option.id === template.layout)?.name ?? ''
    return [template.name, layout].some((field) => field.toLowerCase().includes(words))
  })

  async function createTemplate() {
    setCreating(true)
    try {
      const id = await create({})
      await navigate({ to: '/templates/$id', params: { id } })
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't create the template."))
      setCreating(false)
    }
  }

  async function copy(id: Id<'templates'>) {
    try {
      await duplicate({ id })
      toast.success('Template copied')
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't copy the template."))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="m-0 mt-1 text-sm text-muted">
            Your details and the look of your invoices, set once.
          </p>
        </div>
        {templates && templates.length > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            loading={creating}
            onClick={() => void createTemplate()}
          >
            {creating ? null : <Plus />} New template
          </Button>
        ) : null}
      </div>

      {templates === undefined ? (
        <div
          role="status"
          aria-label="Loading templates"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-sunken">
            <LayoutTemplate aria-hidden="true" className="size-5 text-muted" />
          </span>
          <div>
            <p className="m-0 font-medium">No templates yet.</p>
            <p className="m-0 mt-1 max-w-sm text-sm text-muted">
              A template holds your business and bank details and how your invoices look. Make one
              once, then every invoice takes seconds.
            </p>
          </div>
          <Button className="mt-2" loading={creating} onClick={() => void createTemplate()}>
            {creating ? null : <Plus />} Create your first template
          </Button>
        </Card>
      ) : (
        <>
          <SearchField
            label="Search templates"
            value={query}
            placeholder="Search templates"
            onChange={setQuery}
          />
          {shown.length === 0 ? (
            <Card className="px-6 py-12 text-center text-sm text-muted">No templates match.</Card>
          ) : (
            <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((template) => (
                <li key={template._id}>
                  <Card className="relative flex h-full flex-col overflow-hidden">
                    <div className="border-b border-line bg-sunken p-4" aria-hidden="true">
                      <PaperPreview>
                        <InvoiceDocument
                          invoice={sampleInvoice(template, today(), {
                            business: asBusiness(pickRow(businesses, template.businessId)),
                            payment: asPayment(pickRow(banks, template.bankAccountId)),
                          })}
                          logoUrl={template.logoUrl}
                        />
                      </PaperPreview>
                    </div>
                    <div className="flex items-start justify-between gap-2 p-4">
                      <div className="min-w-0">
                        <Link
                          to="/templates/$id"
                          params={{ id: template._id }}
                          className="block truncate font-semibold outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                        >
                          {template.name}
                        </Link>
                        <p className="m-0 mt-0.5 truncate text-[13px] text-muted">
                          {LAYOUTS.find((l) => l.id === template.layout)?.name} · {template.title}
                        </p>
                      </div>
                      <div className="relative z-10 -mt-1 -mr-2">
                        <Menu
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${template.name}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          }
                          items={[
                            {
                              label: 'Edit',
                              icon: <PenLine />,
                              onSelect: () =>
                                void navigate({
                                  to: '/templates/$id',
                                  params: { id: template._id },
                                }),
                            },
                            {
                              label: 'Duplicate',
                              icon: <Copy />,
                              onSelect: () => void copy(template._id),
                            },
                            'separator',
                            {
                              label: 'Delete',
                              icon: <Trash2 />,
                              danger: true,
                              onSelect: () =>
                                setDeleting({ _id: template._id, name: template.name }),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <DeleteTemplateDialog template={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
