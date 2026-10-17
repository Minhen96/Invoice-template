import type { Id } from '@convex/_generated/dataModel'
import { formatDate } from '@convex/lib/dates'
import { formatSen } from '@convex/lib/money'
import { Link } from '@tanstack/react-router'
import {
  CalendarClock,
  CircleCheck,
  CircleDashed,
  Copy,
  Download,
  MoreHorizontal,
  PenLine,
  Trash2,
} from 'lucide-react'
import { useId } from 'react'

import { InvoiceDocument, PaperPreview, type DocumentInvoice } from '@/components/document'
import { StatusPill } from '@/components/shared/status-pill'
import { Button } from '@/components/ui/button'
import { Menu, type MenuItem } from '@/components/ui/menu'

import type { InvoiceRow } from '../summary'

/** A listed invoice: everything needed for its card, preview included. */
export type ListedInvoice = InvoiceRow & DocumentInvoice & { logoUrl: string | null }

export interface RowActions {
  onOpen: (id: Id<'invoices'>) => void
  onMarkPaid: (row: InvoiceRow) => void
  onMarkUnpaid: (id: Id<'invoices'>) => void
  onDuplicate: (id: Id<'invoices'>, nextMonth: boolean) => void
  onPrint: (id: Id<'invoices'>) => void
  onDelete: (row: InvoiceRow) => void
}

interface InvoiceListProps extends RowActions {
  rows: readonly ListedInvoice[]
}

function money(row: InvoiceRow) {
  return `${row.currency} ${formatSen(row.totalSen)}`.trim()
}

/** Cards with a small preview of each invoice, so they're easy to tell apart at a glance. */
export function InvoiceList({ rows, ...actions }: InvoiceListProps) {
  return (
    <ul
      aria-label="Invoices"
      // minmax(0,1fr): the shrunk preview keeps its full-size layout width, which would
      // otherwise widen a one-column grid past the screen.
      className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3"
    >
      {rows.map((row) => (
        <li key={row._id}>
          <InvoiceCard row={row} {...actions} />
        </li>
      ))}
    </ul>
  )
}

function InvoiceCard({ row, ...actions }: RowActions & { row: ListedInvoice }) {
  const titleId = useId()
  const name = row.name?.trim() ?? ''
  return (
    <article
      aria-labelledby={titleId}
      className="relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-[0_4px_16px_rgb(0_0_0/0.06)]"
    >
      {/* Decorative: the facts are in the text below. */}
      <div className="border-b border-line bg-sunken px-6 pt-4" aria-hidden="true">
        <div className="h-36 overflow-hidden rounded-t-[4px]">
          <PaperPreview>
            <InvoiceDocument invoice={row} logoUrl={row.logoUrl} />
          </PaperPreview>
        </div>
      </div>
      <div className="flex flex-1 items-start gap-2 p-4 pr-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id={titleId} className="m-0 truncate text-[15px] font-semibold">
            <Link
              to="/invoices/$id"
              params={{ id: row._id }}
              className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
            >
              {name || row.number}
            </Link>
          </h2>
          <p className="m-0 truncate text-[13px] text-muted">
            {name ? `${row.number} · ` : ''}
            {row.clientName || 'No client'} · {formatDate(row.issueDate, 'd MMM yyyy')}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="font-semibold tabular">{money(row)}</span>
            <StatusPill status={row.status} />
          </div>
        </div>
        <div className="relative z-10 -mt-1">
          <RowMenu row={row} {...actions} />
        </div>
      </div>
    </article>
  )
}

function RowMenu({ row, ...actions }: RowActions & { row: InvoiceRow }) {
  const id = row._id as Id<'invoices'>
  const items: (MenuItem | 'separator')[] = [
    { label: 'Open', icon: <PenLine />, onSelect: () => actions.onOpen(id) },
    row.status === 'paid'
      ? {
          label: 'Mark as unpaid',
          icon: <CircleDashed />,
          onSelect: () => actions.onMarkUnpaid(id),
        }
      : { label: 'Mark as paid', icon: <CircleCheck />, onSelect: () => actions.onMarkPaid(row) },
    { label: 'Download PDF', icon: <Download />, onSelect: () => actions.onPrint(id) },
    'separator',
    { label: 'Duplicate', icon: <Copy />, onSelect: () => actions.onDuplicate(id, false) },
    {
      label: 'Duplicate for next month',
      icon: <CalendarClock />,
      onSelect: () => actions.onDuplicate(id, true),
    },
    'separator',
    { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => actions.onDelete(row) },
  ]
  return (
    <Menu
      items={items}
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Actions for ${row.number}`}>
          <MoreHorizontal />
        </Button>
      }
    />
  )
}
