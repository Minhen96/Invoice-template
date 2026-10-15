import type { Id } from '@convex/_generated/dataModel'
import { formatDate } from '@convex/lib/dates'
import { paymentStatus } from '@convex/lib/invoiceMath'
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

import { StatusPill } from '@/components/shared/status-pill'
import { Button } from '@/components/ui/button'
import { Menu, type MenuItem } from '@/components/ui/menu'

import type { InvoiceRow } from '../summary'

export interface RowActions {
  onOpen: (id: Id<'invoices'>) => void
  onMarkPaid: (row: InvoiceRow) => void
  onMarkUnpaid: (id: Id<'invoices'>) => void
  onDuplicate: (id: Id<'invoices'>, nextMonth: boolean) => void
  onPrint: (id: Id<'invoices'>) => void
  onDelete: (row: InvoiceRow) => void
}

interface InvoiceListProps extends RowActions {
  rows: readonly InvoiceRow[]
  today: string
}

function money(row: InvoiceRow) {
  return `${row.currency} ${formatSen(row.totalSen)}`.trim()
}

/** Table on wide screens, stacked cards on phones. The whole row opens the invoice. */
export function InvoiceList({ rows, today, ...actions }: InvoiceListProps) {
  return (
    <>
      <table className="hidden w-full border-collapse text-[14px] md:table">
        <thead>
          <tr className="text-left text-[12.5px] text-muted">
            <th className="py-3 pr-4 pl-5 font-medium">Number</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Issued</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="w-14 py-3 pr-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row._id}
              className="group relative border-t border-line transition-colors hover:bg-raised"
            >
              <td className="py-3.5 pr-4 pl-5 font-medium">
                <Link
                  to="/invoices/$id"
                  params={{ id: row._id }}
                  className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                >
                  {row.number}
                </Link>
              </td>
              <td className="max-w-64 truncate px-4 py-3.5">
                {row.clientName || <span className="text-muted">No client</span>}
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap text-muted">
                {formatDate(row.issueDate, 'd MMM yyyy')}
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap text-muted">
                {row.dueDate ? formatDate(row.dueDate, 'd MMM yyyy') : '—'}
              </td>
              <td className="px-4 py-3.5 text-right font-medium whitespace-nowrap tabular">
                {money(row)}
              </td>
              <td className="px-4 py-3.5">
                <StatusPill status={paymentStatus(row, today)} />
              </td>
              <td className="relative z-10 py-2 pr-3 text-right">
                <RowMenu row={row} {...actions} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="m-0 flex list-none flex-col p-0 md:hidden">
        {rows.map((row) => (
          <li
            key={row._id}
            className="relative flex items-center gap-3 border-t border-line py-3.5 pr-2 pl-4 first:border-t-0"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  to="/invoices/$id"
                  params={{ id: row._id }}
                  className="truncate font-medium outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
                >
                  {row.clientName || 'No client'}
                </Link>
                <span className="shrink-0 font-medium tabular">{money(row)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
                <span className="truncate">
                  {row.number} · {formatDate(row.issueDate, 'd MMM yyyy')}
                </span>
                <StatusPill status={paymentStatus(row, today)} />
              </div>
            </div>
            <div className="relative z-10">
              <RowMenu row={row} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </>
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
