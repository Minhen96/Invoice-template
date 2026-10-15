import { lineAmountSen } from '@convex/lib/invoiceMath'
import { formatSen } from '@convex/lib/money'
import type { InvoiceContent, LineItem } from '@convex/lib/validators'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'

import { ParsedInput } from '@/components/shared/number-input'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Field, inputClass } from '@/components/ui/field'
import { cn } from '@/lib/cn'
import { money, quantity } from '@/lib/parse'

import { moveItem, newItem } from '../draft'

interface ItemsSectionProps {
  draft: InvoiceContent
  onChange: (patch: Partial<InvoiceContent>) => void
}

export function ItemsSection({ draft, onChange }: ItemsSectionProps) {
  const { items, labels } = draft
  const setItems = (next: LineItem[]) => onChange({ items: next })
  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  return (
    <SectionCard title="Items">
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            index={index}
            count={items.length}
            labels={labels}
            currency={draft.currency}
            onChange={(patch) => {
              updateItem(index, patch)
            }}
            onMove={(by) => {
              setItems(moveItem(items, index, by))
            }}
            onRemove={() => {
              setItems(items.filter((_, i) => i !== index))
            }}
          />
        ))}
      </ol>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        disabled={items.length >= 100}
        onClick={() => {
          setItems([...items, newItem()])
        }}
      >
        <Plus /> Add item
      </Button>

      <details className="group mt-4">
        <summary className="flex h-11 cursor-pointer list-none items-center text-[13px] font-medium text-muted hover:text-text sm:h-8">
          Rename columns
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(['description', 'rate', 'quantity', 'amount'] as const).map((key) => (
            <Field
              key={key}
              label={`${{ description: 'Description', rate: 'Rate', quantity: 'Quantity', amount: 'Total' }[key]} column heading`}
              value={labels[key]}
              maxLength={60}
              onChange={(e) => onChange({ labels: { ...labels, [key]: e.target.value } })}
            />
          ))}
        </div>
        <p className="m-0 mt-2 text-[12.5px] text-muted">
          The currency is added to Rate and Total automatically, e.g. “Rate Per Session / Hour*
          (RM)”.
        </p>
      </details>
    </SectionCard>
  )
}

interface ItemRowProps {
  item: LineItem
  index: number
  count: number
  labels: InvoiceContent['labels']
  currency: string
  onChange: (patch: Partial<LineItem>) => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
}

function ItemRow({
  item,
  index,
  count,
  labels,
  currency,
  onChange,
  onMove,
  onRemove,
}: ItemRowProps) {
  const id = useId()
  const n = index + 1
  return (
    <li className="rounded-xl border border-line bg-raised p-3">
      <label htmlFor={`${id}-desc`} className="sr-only">
        Item {n} {labels.description}
      </label>
      <textarea
        id={`${id}-desc`}
        value={item.description}
        rows={2}
        maxLength={2000}
        placeholder="What is it for? (e.g. FULL TIME ANNOUNCER OCT 2026)"
        onChange={(e) => onChange({ description: e.target.value })}
        className={cn(
          inputClass,
          '[field-sizing:content] min-h-11 resize-y py-2.5 leading-relaxed',
        )}
      />
      <div className="mt-2 grid grid-cols-[1fr_0.7fr_1fr] gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-rate`} className="text-[12px] text-muted">
            {labels.rate || 'Rate'} {currency ? `(${currency})` : ''}
          </label>
          <ParsedInput
            id={`${id}-rate`}
            inputMode="decimal"
            placeholder="0.00"
            value={item.rateSen}
            parse={money.parse}
            format={money.format}
            invalidMessage="Use a plain amount like 250 or 1,250.50"
            onValueChange={(rateSen) => onChange({ rateSen })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-qty`} className="text-[12px] text-muted">
            {labels.quantity || 'Qty'}
          </label>
          <ParsedInput
            id={`${id}-qty`}
            inputMode="decimal"
            value={item.quantity}
            parse={quantity.parse}
            format={quantity.format}
            onValueChange={(value) => onChange({ quantity: value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-muted">{labels.amount || 'Total'}</span>
          <output
            htmlFor={`${id}-rate ${id}-qty`}
            className="flex h-11 items-center justify-end px-1 font-medium tabular"
          >
            {formatSen(lineAmountSen(item))}
          </output>
        </div>
      </div>
      <div className="mt-1 flex justify-end gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Move item ${String(n)} up`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Move item ${String(n)} down`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          <ArrowDown />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove item ${String(n)}`}
          onClick={onRemove}
          className="hover:bg-danger-bg hover:text-danger"
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}
