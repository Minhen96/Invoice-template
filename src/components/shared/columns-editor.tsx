import { MAX_EXTRA_COLUMNS } from '@convex/lib/defaults'
import type { Columns } from '@convex/lib/validators'
import { Plus, X } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { inputClass } from '@/components/ui/field'
import { cn } from '@/lib/cn'

function newColumnId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

interface ColumnsEditorProps {
  columns: Columns
  /** Shown as the "(RM)" the invoice adds to money columns. */
  currency: string
  onChange: (columns: Columns) => void
}

/**
 * The items table, made easy to picture: first how items are priced (two example cards), then
 * the columns in the same left-to-right order as on the invoice.
 */
export function ColumnsEditor({ columns, currency, onChange }: ColumnsEditorProps) {
  const set = (patch: Partial<Columns>) => {
    onChange({ ...columns, ...patch })
  }
  const pricingGroup = useId()
  const money = currency.trim() ? `(${currency.trim()}) added` : undefined
  const canAdd = columns.extra.length < MAX_EXTRA_COLUMNS
  let position = 0
  const next = () => ++position

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium text-muted">How are items priced?</legend>
        <div className="grid grid-cols-2 gap-2.5">
          <PricingCard
            name={pricingGroup}
            selected={columns.showRateQty}
            title="Rate × Quantity"
            example="250.00 × 20 = 5,000.00"
            onSelect={() => set({ showRateQty: true })}
          />
          <PricingCard
            name={pricingGroup}
            selected={!columns.showRateQty}
            title="Just an amount"
            example="Retainer   3,000.00"
            onSelect={() => set({ showRateQty: false })}
          />
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium text-muted">
          Columns, left to right on the invoice
        </legend>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          <ColumnRow
            n={next()}
            label="Description column heading"
            value={columns.description}
            onChange={(description) => set({ description })}
          />
          {columns.extra.map((column, index) => (
            <ColumnRow
              key={column.id}
              n={next()}
              label={`Your column ${String(index + 1)} heading`}
              placeholder="e.g. Date, Venue, Session"
              value={column.label}
              note="Your column"
              onChange={(label) =>
                set({ extra: columns.extra.map((c, i) => (i === index ? { ...c, label } : c)) })
              }
              action={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove column ${column.label || String(index + 1)}`}
                  onClick={() => set({ extra: columns.extra.filter((_, i) => i !== index) })}
                >
                  <X />
                </Button>
              }
            />
          ))}
          <li className="pl-9">
            <Button
              variant="ghost"
              size="sm"
              disabled={!canAdd}
              onClick={() => set({ extra: [...columns.extra, { id: newColumnId(), label: '' }] })}
            >
              <Plus /> {canAdd ? 'Add a column here' : `Up to ${String(MAX_EXTRA_COLUMNS)} columns`}
            </Button>
          </li>
          {columns.showRateQty ? (
            <>
              <ColumnRow
                n={next()}
                label="Rate column heading"
                value={columns.rate}
                note={money}
                onChange={(rate) => set({ rate })}
              />
              <ColumnRow
                n={next()}
                label="Quantity column heading"
                value={columns.quantity}
                onChange={(quantity) => set({ quantity })}
              />
            </>
          ) : null}
          <ColumnRow
            n={next()}
            label="Total column heading"
            value={columns.amount}
            note={money}
            onChange={(amount) => set({ amount })}
          />
        </ol>
      </fieldset>
    </div>
  )
}

function PricingCard({
  name,
  selected,
  title,
  example,
  onSelect,
}: {
  /** Radio group name (unique per editor on the page). */
  name: string
  selected: boolean
  title: string
  example: string
  onSelect: () => void
}) {
  const exampleId = useId()
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col gap-1 rounded-xl border border-line p-3 transition-colors hover:border-line-strong has-focus-visible:outline-2 has-focus-visible:outline-focus',
        selected && 'border-ink bg-raised hover:border-ink',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        {/* Named by the title only; the example is read as its description. */}
        <input
          type="radio"
          name={name}
          checked={selected}
          onChange={onSelect}
          aria-label={title}
          aria-describedby={exampleId}
          className="size-4 accent-ink"
        />
        {title}
      </span>
      <span id={exampleId} className="pl-6 text-[12.5px] whitespace-pre text-muted tabular">
        {example}
      </span>
    </label>
  )
}

function ColumnRow({
  n,
  label,
  value,
  placeholder,
  note,
  onChange,
  action,
}: {
  n: number
  /** Accessible name; the visible cue is the position number. */
  label: string
  value: string
  placeholder?: string
  /** Small hint under the box, e.g. "(RM) added" or "Your column". */
  note?: string | undefined
  onChange: (value: string) => void
  action?: ReactNode
}) {
  const id = useId()
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="mt-2.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-[12px] font-semibold text-muted"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          maxLength={60}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, 'h-11')}
        />
        {note ? <span className="text-[12px] text-muted">{note}</span> : null}
      </div>
      {action}
    </li>
  )
}
