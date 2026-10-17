import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ArrowRight, FileText, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { MarkPaidDialog } from '@/components/shared/mark-paid-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SearchField } from '@/components/ui/search-field'
import { Skeleton } from '@/components/ui/skeleton'
import { useNewInvoice } from '@/hooks/new-invoice-context'
import { useDeleteWithUndo, useInvoiceActions } from '@/hooks/use-invoice-actions'
import { cn } from '@/lib/cn'
import { pickRow } from '@/lib/parties'
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
  paid: 'Paid',
}

interface InvoicesPageProps {
  status: StatusFilter
  q: string
  onSearchChange: (next: { status?: StatusFilter; q?: string }) => void
}

export function InvoicesPage({ status, q, onSearchChange }: InvoicesPageProps) {
  const rows = useQuery(api.invoices.list)
  const templates = useQuery(api.templates.list)
  const businesses = useQuery(api.businesses.list)
  const navigate = useNavigate()
  const newInvoice = useNewInvoice()
  const { duplicate, markUnpaid, print } = useInvoiceActions()
  const { hidden, deleteInvoice } = useDeleteWithUndo()
  const [paying, setPaying] = useState<InvoiceRow | null>(null)
  const today = todayIso()

  const visibleRows = useMemo(
    () => (rows ?? []).filter((row) => !hidden.has(row._id)),
    [rows, hidden],
  )
  const summary = useMemo(() => summarise(visibleRows, today), [visibleRows, today])
  const counts = useMemo(() => countByFilter(visibleRows), [visibleRows])
  const filtered = useMemo(
    () => filterInvoices(visibleRows, { status, q }),
    [visibleRows, status, q],
  )
  // The most common currency first in the totals (from the first template, else RM).
  const currency = templates?.[0]?.currency ?? 'RM'
  // null = never saved; undefined = still loading (don't flash the nudge).
  // First-run guidance, one step at a time: business details, then a template.
  const setup =
    businesses?.length === 0 || (businesses !== undefined && pickRow(businesses)?.name === '')
      ? 'business'
      : templates?.length === 0
        ? 'template'
        : null

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

      {setup ? (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="m-0 font-medium">
              {setup === 'business' ? 'Add your business details' : 'Set up your invoice template'}
            </p>
            <p className="m-0 mt-0.5 text-sm text-muted">
              {setup === 'business'
                ? 'Your business and bank details go on every invoice — fill them in once.'
                : 'Choose the look and columns once — every invoice reuses them.'}
            </p>
          </div>
          <Link
            to={setup === 'business' ? '/account' : '/templates'}
            className="inline-flex h-11 items-center gap-1.5 self-start rounded-[10px] border border-line px-4 text-sm font-medium hover:bg-raised sm:h-9 sm:self-auto"
          >
            {setup === 'business' ? 'Open account' : 'Set up template'}{' '}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Card>
      ) : null}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          className="max-sm:col-span-2"
          label="Outstanding"
          value={rows === undefined ? null : formatAmounts(summary.outstanding, currency)}
          note={`${String(summary.outstandingCount)} unpaid`}
        />
        <Stat
          label={`Paid in ${today.slice(0, 4)}`}
          value={rows === undefined ? null : formatAmounts(summary.paidThisYear, currency)}
          note="Money received"
        />
        {/* A box the size of the figures beside it: the main thing to do here. */}
        <button
          type="button"
          onClick={() => newInvoice()}
          className="flex flex-col items-start justify-between gap-3 rounded-card bg-ink p-4 text-left text-onink shadow-card transition-colors hover:bg-ink/88 sm:p-5"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-onink/15">
            <Plus aria-hidden="true" className="size-5" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold sm:text-base">Create invoice</span>
            <span className="text-[12.5px] text-onink/75">Takes a minute</span>
          </span>
        </button>
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
          <SearchField
            label="Search invoices"
            value={q}
            placeholder="Search name, number, client, amount"
            onChange={(next) => {
              onSearchChange({ q: next })
            }}
          />
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
            <Button onClick={() => newInvoice()} className="mt-2">
              <Plus />
              New invoice
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="m-0 px-6 py-12 text-center text-sm text-muted">No invoices match.</p>
        ) : (
          <InvoiceList
            rows={filtered}
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
  className,
}: {
  label: string
  value: string | null
  note: string
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col gap-1 p-4 sm:p-5', className)}>
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {value === null ? (
        <Skeleton className="my-1 h-7 w-28" />
      ) : (
        <span className="text-lg font-semibold tracking-tight tabular sm:text-[22px]">{value}</span>
      )}
      <span className="text-[12.5px] text-muted">{note}</span>
    </Card>
  )
}

function ListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading invoices"
      className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3"
    >
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-60 w-full" />
      ))}
    </div>
  )
}
