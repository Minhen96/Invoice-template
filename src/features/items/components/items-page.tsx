import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { formatSen } from '@convex/lib/money'
import { useMutation, useQuery } from 'convex/react'
import { MoreHorizontal, Package, PenLine, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type SyntheticEvent } from 'react'
import { toast } from 'sonner'

import { ParsedInput } from '@/components/shared/number-input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { TextAreaField } from '@/components/ui/field'
import { Menu } from '@/components/ui/menu'
import { SearchField } from '@/components/ui/search-field'
import { Skeleton } from '@/components/ui/skeleton'
import { errorCode, errorMessage } from '@/lib/errors'
import { money } from '@/lib/parse'

type Item = Doc<'items'>

function timesUsed(count: number) {
  if (count === 0) return 'Not used yet'
  return count === 1 ? 'Used once' : `Used ${String(count)} times`
}

export function ItemsPage() {
  const items = useQuery(api.items.list)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Item | null>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items ?? []).filter((item) => q === '' || item.description.toLowerCase().includes(q))
  }, [items, query])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Items</h1>
          <p className="m-0 mt-1 text-sm text-muted">
            What you bill for, with its price. Start typing on an invoice to reuse one.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing('new')}>
          <Plus /> Add item
        </Button>
      </div>

      <Card className="overflow-hidden">
        {items === undefined ? (
          <div role="status" aria-label="Loading items" className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-sunken">
              <Package aria-hidden="true" className="size-5 text-muted" />
            </span>
            <div>
              <p className="m-0 font-medium">No items yet.</p>
              <p className="m-0 mt-1 max-w-sm text-sm text-muted">
                Add the things you bill for, or just put them on an invoice: they&apos;re remembered
                here so next time you can pick them instead of typing.
              </p>
            </div>
            <Button className="mt-2" onClick={() => setEditing('new')}>
              <Plus /> Add item
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-line p-3">
              <SearchField
                label="Search items"
                value={query}
                placeholder="Search items"
                onChange={setQuery}
              />
            </div>
            {shown.length === 0 ? (
              <p className="m-0 px-6 py-12 text-center text-sm text-muted">No items match.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {shown.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center gap-3 border-t border-line py-3 pr-2 pl-5 first:border-t-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 line-clamp-2 text-[14px] font-medium whitespace-pre-line">
                        {item.description}
                      </p>
                      <p className="m-0 mt-0.5 text-[13px] text-muted">
                        {timesUsed(item.useCount)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[14px] font-medium tabular">
                      {formatSen(item.rateSen)}
                    </span>
                    <Menu
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${item.description}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      }
                      items={[
                        { label: 'Edit', icon: <PenLine />, onSelect: () => setEditing(item) },
                        'separator',
                        {
                          label: 'Delete',
                          icon: <Trash2 />,
                          danger: true,
                          onSelect: () => setDeleting(item),
                        },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      <EditItemDialog item={editing} onClose={() => setEditing(null)} />
      <DeleteItemDialog item={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}

/** Add an item (`'new'`) or edit one. */
function EditItemDialog({ item, onClose }: { item: Item | 'new' | null; onClose: () => void }) {
  const adding = item === 'new'
  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={adding ? 'Add item' : 'Edit item'}
      description={
        adding
          ? 'It will be suggested when you type on an invoice.'
          : 'Changes apply to future suggestions. Invoices already made keep their wording.'
      }
    >
      {item ? (
        <EditItemForm
          key={adding ? 'new' : item._id}
          item={adding ? null : item}
          onDone={onClose}
        />
      ) : null}
    </Dialog>
  )
}

function EditItemForm({ item, onDone }: { item: Item | null; onDone: () => void }) {
  const create = useMutation(api.items.create)
  const update = useMutation(api.items.update)
  const [description, setDescription] = useState(item?.description ?? '')
  const [rateSen, setRateSen] = useState(item?.rateSen ?? 0)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function submit(event: SyntheticEvent) {
    event.preventDefault()
    if (description.trim() === '') {
      setError('Describe the item.')
      return
    }
    setSaving(true)
    try {
      if (item) await update({ id: item._id, description, rateSen })
      else await create({ description, rateSen })
      toast.success(item ? 'Item saved' : 'Item added')
      onDone()
    } catch (e) {
      if (errorCode(e) === 'duplicate') setError('You already have an item with this description.')
      else toast.error(errorMessage(e, "Couldn't save the item."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
      <TextAreaField
        label="Description"
        rows={3}
        maxLength={2000}
        value={description}
        error={error}
        onChange={(e) => {
          setDescription(e.target.value)
          setError(undefined)
        }}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="item-price" className="text-[13px] font-medium text-muted">
          Price
        </label>
        <ParsedInput
          id="item-price"
          inputMode="decimal"
          placeholder="0.00"
          value={rateSen}
          parse={money.parse}
          format={money.format}
          onValueChange={setRateSen}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save
        </Button>
      </div>
    </form>
  )
}

function DeleteItemDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const remove = useMutation(api.items.remove)
  const [pending, setPending] = useState(false)

  async function confirm() {
    if (!item) return
    setPending(true)
    try {
      await remove({ id: item._id })
      toast.success('Item removed')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't remove the item."))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Remove this item?"
      description="It won't be suggested any more. Invoices that used it are unaffected."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={pending} onClick={() => void confirm()}>
            Remove
          </Button>
        </>
      }
    >
      <p className="m-0 line-clamp-3 text-sm whitespace-pre-line">{item?.description}</p>
    </Dialog>
  )
}
