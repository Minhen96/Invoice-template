import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { formatDate } from '@convex/lib/dates'
import { paymentStatus } from '@convex/lib/invoiceMath'
import type { InvoiceContent } from '@convex/lib/validators'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  CircleCheck,
  CircleDashed,
  Copy,
  Download,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  InvoiceDocument,
  PaperPreview,
  printInvoice,
  type DocumentInvoice,
} from '@/components/document'
import { MarkPaidDialog } from '@/components/shared/mark-paid-dialog'
import { StatusPill } from '@/components/shared/status-pill'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Menu } from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoiceActions } from '@/hooks/use-invoice-actions'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { today } from '@/lib/today'

import { toDraft } from '../draft'
import { useAutosave, type SaveState } from '../use-autosave'

import { BillToSection } from './bill-to-section'
import { DesignSection } from './design-section'
import { DetailsSection } from './details-section'
import { ExtrasSection } from './extras-section'
import { ItemsSection } from './items-section'
import { FromSection, PaymentSection } from './party-sections'

export function EditorPage({ id }: { id: string }) {
  const invoice = useQuery(api.invoices.get, { id })
  if (invoice === undefined) return <EditorSkeleton />
  if (invoice === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="m-0 font-medium">This invoice doesn&apos;t exist.</p>
        <p className="m-0 text-sm text-muted">It may have been deleted.</p>
        <Link to="/" className="font-medium underline underline-offset-4">
          Back to invoices
        </Link>
      </div>
    )
  }
  // Keyed by id: opening another invoice starts a fresh draft.
  return <Editor key={invoice._id} invoice={invoice} />
}

type MobileView = 'edit' | 'preview'

function Editor({ invoice }: { invoice: Doc<'invoices'> }) {
  const profile = useQuery(api.profiles.get)
  const clients = useQuery(api.clients.list)
  const navigate = useNavigate()
  const { duplicate, markUnpaid } = useInvoiceActions()
  const [draft, setDraft] = useState<InvoiceContent>(() => toDraft(invoice))
  const { state, error, flush } = useAutosave(invoice._id, draft)
  const [mobileView, setMobileView] = useState<MobileView>('edit')
  const [paying, setPaying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const change = useCallback((patch: Partial<InvoiceContent>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  // The live status comes from the server (it's changed by its own actions, not the draft).
  const document: DocumentInvoice = useMemo(
    () => ({ ...draft, status: invoice.status, paidAt: invoice.paidAt }),
    [draft, invoice.status, invoice.paidAt],
  )
  const logoUrl = profile?.logoUrl ?? null
  const status = paymentStatus({ status: invoice.status, dueDate: draft.dueDate }, today())

  async function download() {
    await flush()
    try {
      await printInvoice(document, logoUrl)
    } catch {
      toast.error("Couldn't open the PDF. Please try again.")
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Link
          to="/"
          className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:text-text sm:h-9"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Invoices
        </Link>
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="m-0 truncate text-xl font-semibold tracking-tight">
            {draft.number || 'Untitled'}
          </h1>
          <StatusPill status={status} />
        </div>
        <SaveIndicator state={state} message={error?.message} onRetry={() => void flush()} />

        <div className="ml-auto flex items-center gap-2">
          {invoice.status === 'paid' ? (
            <span className="hidden text-[13px] text-muted lg:inline">
              Paid {formatDate(invoice.paidAt, 'd MMM yyyy')}
            </span>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setPaying(true)}>
              <CircleCheck /> <span className="max-sm:sr-only">Mark as paid</span>
            </Button>
          )}
          <Button size="sm" onClick={() => void download()}>
            <Download /> <span className="max-sm:sr-only">Download PDF</span>
          </Button>
          <Menu
            trigger={
              <Button variant="secondary" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            }
            items={[
              ...(invoice.status === 'paid'
                ? [
                    {
                      label: 'Mark as unpaid',
                      icon: <CircleDashed />,
                      onSelect: () => void markUnpaid(invoice._id),
                    },
                    'separator' as const,
                  ]
                : []),
              {
                label: 'Duplicate',
                icon: <Copy />,
                onSelect: () => void flush().then(() => duplicate(invoice._id, false)),
              },
              {
                label: 'Duplicate for next month',
                icon: <CalendarClock />,
                onSelect: () => void flush().then(() => duplicate(invoice._id, true)),
              },
              'separator',
              {
                label: 'Delete',
                icon: <Trash2 />,
                danger: true,
                onSelect: () => setConfirmDelete(true),
              },
            ]}
          />
        </div>
      </div>

      {/* Phone: switch between the form and the preview. */}
      <div
        role="tablist"
        aria-label="View"
        className="grid grid-cols-2 rounded-xl bg-sunken p-1 lg:hidden"
      >
        {(['edit', 'preview'] as const).map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={mobileView === view}
            onClick={() => setMobileView(view)}
            className={cn(
              'h-10 rounded-lg text-sm font-medium text-muted',
              mobileView === view && 'bg-surface text-text shadow-card',
            )}
          >
            {view === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
        <div className={cn('flex flex-col gap-4', mobileView === 'preview' && 'max-lg:hidden')}>
          <DesignSection draft={draft} document={document} logoUrl={logoUrl} onChange={change} />
          <DetailsSection
            draft={draft}
            numberError={error?.code === 'number_taken' ? error.message : undefined}
            onChange={change}
          />
          <BillToSection draft={draft} clients={clients} onChange={change} />
          <ItemsSection draft={draft} onChange={change} />
          <ExtrasSection draft={draft} isPaid={invoice.status === 'paid'} onChange={change} />
          <FromSection from={draft.from} onChange={(from) => change({ from })} />
          <PaymentSection payment={draft.payment} onChange={(payment) => change({ payment })} />
        </div>

        <section
          aria-label="Preview"
          className={cn('lg:sticky lg:top-24', mobileView === 'edit' && 'max-lg:hidden')}
        >
          <PaperPreview>
            <InvoiceDocument invoice={document} logoUrl={logoUrl} />
          </PaperPreview>
        </section>
      </div>

      <MarkPaidDialog
        invoiceId={paying ? invoice._id : null}
        number={draft.number}
        onClose={() => setPaying(false)}
      />
      <DeleteDialog
        open={confirmDelete}
        number={draft.number}
        onClose={() => setConfirmDelete(false)}
        onDeleted={() => void navigate({ to: '/' })}
        id={invoice._id}
      />
    </div>
  )
}

function SaveIndicator({
  state,
  message,
  onRetry,
}: {
  state: SaveState
  message: string | undefined
  onRetry: () => void
}) {
  if (state === 'error') {
    return (
      <span role="alert" className="flex items-center gap-1.5 text-[13px] text-danger">
        <AlertCircle aria-hidden="true" className="size-4" />
        {message ?? "Couldn't save."}
        <button
          type="button"
          onClick={onRetry}
          className="font-medium underline underline-offset-2"
        >
          Retry
        </button>
      </span>
    )
  }
  return (
    <span aria-live="polite" className="flex items-center gap-1.5 text-[13px] text-muted">
      {state === 'saved' ? (
        <>
          <Check aria-hidden="true" className="size-4" /> Saved
        </>
      ) : (
        'Saving…'
      )}
    </span>
  )
}

function DeleteDialog({
  open,
  number,
  id,
  onClose,
  onDeleted,
}: {
  open: boolean
  number: string
  id: Id<'invoices'>
  onClose: () => void
  onDeleted: () => void
}) {
  const remove = useMutation(api.invoices.remove)
  const [deleting, setDeleting] = useState(false)

  async function confirm() {
    setDeleting(true)
    try {
      await remove({ id })
      toast.success(`Deleted ${number}`)
      onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete the invoice."))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={`Delete ${number}?`}
      description="This can't be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={() => void confirm()}>
            Delete
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm text-muted">The invoice and its payment record will be removed.</p>
    </Dialog>
  )
}

function EditorSkeleton() {
  return (
    <div role="status" aria-label="Loading invoice" className="flex flex-col gap-5">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="hidden aspect-[210/297] lg:block" />
      </div>
    </div>
  )
}
