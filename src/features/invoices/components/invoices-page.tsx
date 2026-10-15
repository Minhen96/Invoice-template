import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ArrowRight, FileText, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { MarkPaidDialog } from '@/components/shared/mark-paid-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { inputClass } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateInvoice } from '@/hooks/use-create-invoice'
import { useDeleteWithUndo, useInvoiceActions } from '@/hooks/use-invoice-actions'
import { cn } from '@/lib/cn'
import { today as todayIso } from '@/lib/today'

import {
  countByFilter,
  filterInvoices,
  formatAmounts,
  STATUS_FILTERS,
  summarise,
  type InvoiceRow,
  type StatusFilter,
} from '../summary'

import { InvoiceList } from './invoice-list'

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  paid: 'Paid',
}

interface InvoicesPageProps {
  status: StatusFilter
  q: string
  onSearchChange: (next: { status?: StatusFilter; q?: string }) => void
}

export function InvoicesPage({ status, q, onSearchChange }: InvoicesPageProps) {
  const rows = useQuery(api.invoices.list)
  const profile = useQuery(api.profiles.get)
  const navigate = useNavigate()
  const { createInvoice, creating } = useCreateInvoice()
  const { duplicate, markUnpaid, print } = useInvoiceActions()
  const { hidden, deleteInvoice } = useDeleteWithUndo()
  const [paying, setPaying] = useState<InvoiceRow | null>(null)
  const today = todayIso()

  const visibleRows = useMemo(
    () => (rows ?? []).filter((row) => !hidden.has(row._id)),
    [rows, hidden],
  )
  const summary = useMemo(() => summarise(visibleRows, today), [visibleRows, today])
  const counts = useMemo(() => countByFilter(visibleRows, today), [visibleRows, today])
  const filtered = useMemo(
    () => filterInvoices(visibleRows, { status, q }, today),
    [visibleRows, status, q, today],
  )
  const currency = profile?.defaults.currency ?? 'RM'
  // null = never saved; undefined = still loading (don't flash the nudge).
  const needsSetup = profile === null || profile?.business.name === ''

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="m-0 mt-1 text-sm text-muted">
            Everything you&apos;ve billed, and what&apos;s still to come in.
          </p>
        </div>
      </div>

      {needsSetup ? (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="m-0 font-medium">Add your details once</p>
            <p className="m-0 mt-0.5 text-sm text-muted">
              Your business and bank details will fill in every new invoice automatically.
            </p>
          </div>
          <Link
            to="/settings"
            className="inline-flex h-11 items-center gap-1.5 self-start rounded-[10px] border border-line px-4 text-sm font-medium hover:bg-raised sm:h-9 sm:self-auto"
          >
            Open settings <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Card>
      ) : null}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Outstanding"
          value={rows === undefined ? null : formatAmounts(summary.outstanding, currency)}
          note={`${String(summary.outstandingCount)} unpaid`}
        />
        <Stat
          label="Overdue"
          value={rows === undefined ? null : formatAmounts(summary.overdue, currency)}
          note={`${String(summary.overdueCount)} past due`}
          tone={summary.overdueCount > 0 ? 'overdue' : undefined}
        />
        <Stat
          label={`Paid in ${today.slice(0, 4)}`}
          value={rows === undefined ? null : formatAmounts(summary.paidThisYear, currency)}
          note="Money received"
        />
        <Stat
          label={`Invoiced in ${today.slice(0, 4)}`}
          value={rows === undefined ? null : formatAmounts(summary.invoicedThisYear, currency)}
          note="Total billed"
        />
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Filter by status" className="flex gap-1 overflow-x-auto">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={status === filter}
                onClick={() => onSearchChange({ status: filter })}
                className={cn(
                  'flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:text-text sm:h-9',
                  status === filter && 'bg-sunken text-text',
                )}
              >
                {FILTER_LABELS[filter]}
                <span className="text-[12px] text-muted tabular">{counts[filter]}</span>
              </button>
            ))}
          </div>
          <label className="relative block sm:w-64">
            <span className="sr-only">Search invoices</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={q}
              placeholder="Search number, client, amount"
              onChange={(e) => onSearchChange({ q: e.target.value })}
              className={cn(inputClass, 'h-11 pl-9 sm:h-9 sm:text-sm')}
            />
          </label>
        </div>

        {rows === undefined ? (
          <ListSkeleton />
        ) : visibleRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-sunken">
              <FileText aria-hidden="true" className="size-5 text-muted" />
            </span>
            <div>
              <p className="m-0 font-medium">No invoices yet.</p>
              <p className="m-0 mt-1 text-sm text-muted">
                Create your first one — it takes a minute.
              </p>
            </div>
            <Button loading={creating} onClick={() => void createInvoice()} className="mt-2">
              {creating ? null : <Plus />}
              New invoice
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="m-0 px-6 py-12 text-center text-sm text-muted">No invoices match.</p>
        ) : (
          <InvoiceList
            rows={filtered}
            today={today}
            onOpen={(id) => void navigate({ to: '/invoices/$id', params: { id } })}
            onMarkPaid={setPaying}
            onMarkUnpaid={(id) => void markUnpaid(id)}
            onDuplicate={(id, nextMonth) => void duplicate(id, nextMonth)}
            onPrint={(id) => void print(id)}
            onDelete={(row) => {
              deleteInvoice(row._id as Id<'invoices'>, row.number)
            }}
          />
        )}
      </Card>

      <MarkPaidDialog
        invoiceId={paying ? (paying._id as Id<'invoices'>) : null}
        number={paying?.number ?? ''}
        onClose={() => {
          setPaying(null)
        }}
      />
    </div>
  )
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string | null
  note: string
  tone?: 'overdue' | undefined
}) {
  return (
    <Card className="flex flex-col gap-1 p-4 sm:p-5">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {value === null ? (
        <Skeleton className="my-1 h-7 w-28" />
      ) : (
        <span
          className={cn(
            'text-lg font-semibold tracking-tight tabular sm:text-[22px]',
            tone === 'overdue' && 'text-overdue',
          )}
        >
          {value}
        </span>
      )}
      <span className="text-[12.5px] text-muted">{note}</span>
    </Card>
  )
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading invoices" className="flex flex-col gap-3 p-5">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
