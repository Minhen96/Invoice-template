import type { Doc } from '@convex/_generated/dataModel'
import { lineAmountSen } from '@convex/lib/invoiceMath'
import { formatSen } from '@convex/lib/money'
import type { InvoiceContent, LineItem } from '@convex/lib/validators'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { ParsedInput } from '@/components/shared/number-input'
import { Button } from '@/components/ui/button'
import { inputClass } from '@/components/ui/field'
import { cn } from '@/lib/cn'
import { money, quantity } from '@/lib/parse'

import { ItemDescription } from './item-description'

interface ItemRowProps {
  item: LineItem
  index: number
  count: number
  columns: InvoiceContent['columns']
  currency: string
  remembered: readonly Doc<'items'>[]
  onChange: (patch: Partial<LineItem>) => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
}

/**
 * One invoice item: description (with past-item suggestions), your own columns, rate and
 * quantity (or one amount), and move / remove buttons.
 */
export function ItemRow({
  item,
  index,
  count,
  columns,
  currency,
  remembered,
  onChange,
  onMove,
  onRemove,
}: ItemRowProps) {
  const id = useId()
  const n = index + 1
  return (
    <li className="rounded-xl border border-line bg-raised p-3">
      <label htmlFor={`${id}-desc`} className="sr-only">
        Item {n} {columns.description}
      </label>
      <ItemDescription
        id={`${id}-desc`}
        value={item.description}
        remembered={remembered}
        onChange={(description) => onChange({ description })}
        onPick={(picked) =>
          onChange({
            description: picked.description,
            rateSen: picked.rateSen,
            quantity: columns.showRateQty ? picked.quantity : 1,
          })
        }
      />
      {columns.extra.length > 0 ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {columns.extra.map((column, i) => (
            <div key={column.id} className="flex flex-col gap-1">
              <label htmlFor={`${id}-x${String(i)}`} className="text-[12px] text-muted">
                <span className="sr-only">Item {n} </span>
                {column.label || `Column ${String(i + 1)}`}
              </label>
              <input
                id={`${id}-x${String(i)}`}
                value={item.extra[column.id] ?? ''}
                maxLength={500}
                onChange={(e) =>
                  onChange({ extra: { ...item.extra, [column.id]: e.target.value } })
                }
                className={cn(inputClass, 'h-11')}
              />
            </div>
          ))}
        </div>
      ) : null}
      {columns.showRateQty ? (
        <div className="mt-2 grid grid-cols-[1fr_0.7fr_1fr] gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-rate`} className="text-[12px] text-muted">
              {columns.rate || 'Rate'} {currency ? `(${currency})` : ''}
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
              {columns.quantity || 'Qty'}
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
            <span className="text-[12px] text-muted">{columns.amount || 'Total'}</span>
            <output
              htmlFor={`${id}-rate ${id}-qty`}
              className="flex h-11 items-center justify-end px-1 font-medium tabular"
            >
              {formatSen(lineAmountSen(item))}
            </output>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-1">
          <label htmlFor={`${id}-rate`} className="text-[12px] text-muted">
            {columns.amount || 'Amount'} {currency ? `(${currency})` : ''}
          </label>
          <ParsedInput
            id={`${id}-rate`}
            inputMode="decimal"
            placeholder="0.00"
            value={item.rateSen}
            parse={money.parse}
            format={money.format}
            invalidMessage="Use a plain amount like 250 or 1,250.50"
            onValueChange={(rateSen) => onChange({ rateSen, quantity: 1 })}
          />
        </div>
      )}
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

const compactInput = 'h-11 sm:h-9 sm:text-sm'

/**
 * Column widths for the one-line item rows (wide screens): description takes the room left,
 * then your columns, the figures and the remove button.
 */
function compactItemColumns(columns: InvoiceContent['columns']): string {
  const extras = columns.extra.map(() => '6rem')
  const figures = columns.showRateQty ? ['6.5rem', '4.5rem', '5.5rem'] : ['7.5rem']
  return ['minmax(0,1fr)', ...extras, ...figures, '2.75rem'].join(' ')
}

/** The headings above the one-line rows (wide screens only; each box also has its own label). */
export function CompactItemHeader({
  columns,
  currency,
}: {
  columns: InvoiceContent['columns']
  currency: string
}) {
  const unit = currency ? ` (${currency})` : ''
  const cell = 'truncate text-[12px] font-medium text-muted'
  return (
    <div
      aria-hidden="true"
      className="hidden gap-2 border-b border-line bg-sunken px-3 py-2 md:grid"
      style={{ gridTemplateColumns: compactItemColumns(columns) }}
    >
      <span className={cell}>{columns.description || 'Description'}</span>
      {columns.extra.map((column, i) => (
        <span key={column.id} className={cell}>
          {column.label || `Column ${String(i + 1)}`}
        </span>
      ))}
      {columns.showRateQty ? (
        <>
          <span className={cell}>
            {columns.rate || 'Rate'}
            {unit}
          </span>
          <span className={cell}>{columns.quantity || 'Qty'}</span>
          <span className={cn(cell, 'text-right')}>{columns.amount || 'Total'}</span>
        </>
      ) : (
        <span className={cell}>
          {columns.amount || 'Amount'}
          {unit}
        </span>
      )}
      <span />
    </div>
  )
}

/**
 * A slim item for the New invoice popup: one table row per item on wider screens (under
 * `CompactItemHeader`); on narrow ones the description gets its own line with the figures
 * below. No reordering here; that's on the invoice page.
 */
export function CompactItemRow({
  item,
  index,
  columns,
  currency,
  remembered,
  onChange,
  onRemove,
}: Omit<ItemRowProps, 'count' | 'onMove'>) {
  const id = useId()
  const n = index + 1
  const unit = currency ? ` (${currency})` : ''
  return (
    <li
      className="flex flex-wrap items-end gap-2 border-t border-line px-3 py-3 first:border-t-0 md:grid md:items-start md:py-2"
      style={{ gridTemplateColumns: compactItemColumns(columns) }}
    >
      <div className="min-w-0 basis-full md:basis-auto">
        <label htmlFor={`${id}-desc`} className="sr-only">
          Item {n} {columns.description}
        </label>
        <ItemDescription
          id={`${id}-desc`}
          compact
          value={item.description}
          remembered={remembered}
          onChange={(description) => onChange({ description })}
          onPick={(picked) =>
            onChange({
              description: picked.description,
              rateSen: picked.rateSen,
              quantity: columns.showRateQty ? picked.quantity : 1,
            })
          }
        />
      </div>
      {columns.extra.map((column, i) => (
        <SmallField
          key={column.id}
          id={`${id}-x${String(i)}`}
          label={column.label || `Column ${String(i + 1)}`}
          srPrefix={`Item ${String(n)} `}
        >
          <input
            id={`${id}-x${String(i)}`}
            value={item.extra[column.id] ?? ''}
            maxLength={500}
            onChange={(e) => onChange({ extra: { ...item.extra, [column.id]: e.target.value } })}
            className={cn(inputClass, compactInput)}
          />
        </SmallField>
      ))}
      {columns.showRateQty ? (
        <>
          <SmallField id={`${id}-rate`} label={`${columns.rate || 'Rate'}${unit}`}>
            <ParsedInput
              id={`${id}-rate`}
              inputMode="decimal"
              placeholder="0.00"
              value={item.rateSen}
              parse={money.parse}
              format={money.format}
              invalidMessage="Use a plain amount like 250 or 1,250.50"
              onValueChange={(rateSen) => onChange({ rateSen })}
              className={compactInput}
            />
          </SmallField>
          <SmallField id={`${id}-qty`} label={columns.quantity || 'Qty'} narrow>
            <ParsedInput
              id={`${id}-qty`}
              inputMode="decimal"
              value={item.quantity}
              parse={quantity.parse}
              format={quantity.format}
              onValueChange={(value) => onChange({ quantity: value })}
              className={compactInput}
            />
          </SmallField>
          <output
            htmlFor={`${id}-rate ${id}-qty`}
            aria-label={`Item ${String(n)} total`}
            className="ml-auto flex h-11 min-w-20 items-center justify-end gap-1.5 text-sm font-medium tabular sm:h-9 md:ml-0 md:min-w-0"
          >
            <span aria-hidden="true" className="font-normal text-muted md:hidden">
              Total
            </span>
            {formatSen(lineAmountSen(item))}
          </output>
        </>
      ) : (
        <SmallField id={`${id}-rate`} label={`${columns.amount || 'Amount'}${unit}`}>
          <ParsedInput
            id={`${id}-rate`}
            inputMode="decimal"
            placeholder="0.00"
            value={item.rateSen}
            parse={money.parse}
            format={money.format}
            invalidMessage="Use a plain amount like 250 or 1,250.50"
            onValueChange={(rateSen) => onChange({ rateSen, quantity: 1 })}
            className={compactInput}
          />
        </SmallField>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove item ${String(n)}`}
        onClick={onRemove}
        className="shrink-0 hover:bg-danger-bg hover:text-danger"
      >
        <Trash2 />
      </Button>
    </li>
  )
}

/** A box with a small label above it; on wide screens the label moves to the header row. */
function SmallField({
  id,
  label,
  srPrefix,
  narrow = false,
  children,
}: {
  id: string
  label: string
  /** Read only by screen readers before the label, e.g. "Item 2 ". */
  srPrefix?: string
  narrow?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 md:w-auto md:min-w-0',
        narrow ? 'w-20' : 'min-w-24 flex-1',
      )}
    >
      <label htmlFor={id} className="truncate text-[12px] text-muted md:sr-only">
        {srPrefix ? <span className="sr-only">{srPrefix}</span> : null}
        {label}
      </label>
      {children}
    </div>
  )
}
