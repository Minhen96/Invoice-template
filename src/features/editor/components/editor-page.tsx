import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { formatDate } from '@convex/lib/dates'
import { switchTemplate } from '@convex/lib/templateSwitch'
import type { InvoiceContent } from '@convex/lib/validators'
import { Link, useBlocker, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  ArrowLeft,
  Check,
  CircleCheck,
  CircleDashed,
  Download,
  MousePointerClick,
  Palette,
  PenLine,
  Trash2,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  InvoiceDocument,
  PaperPreview,
  printInvoice,
  type DocumentInvoice,
  type EditPart,
} from '@/components/document'
import { MarkPaidDialog } from '@/components/shared/mark-paid-dialog'
import { StatusPill } from '@/components/shared/status-pill'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoiceActions } from '@/hooks/use-invoice-actions'
import { errorCode, errorMessage } from '@/lib/errors'
import { isBlankItem, newItem } from '@/lib/line-items'

import { toDraft } from '../draft'

import { InvoiceName } from './invoice-name'
import { PartDialog, type OpenPart } from './part-dialogs'
import { TemplateSwitcher } from './template-switcher'

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
  // Keyed by id: another invoice starts afresh (out of edit mode).
  return <Editor key={invoice._id} invoice={invoice} />
}

type LoadedInvoice = Doc<'invoices'> & { logoUrl: string | null }

/** An edit in progress: nothing is saved until Save. */
interface Edit {
  draft: InvoiceContent
  templateId: Id<'templates'> | undefined
  logoUrl: string | null
}

/** Phone shortcuts: the paper is small there, so these are easier to tap. */
const QUICK_PARTS: { label: string; part: EditPart }[] = [
  { label: 'Bill to', part: { kind: 'billTo' } },
  { label: '+ Add item', part: { kind: 'addItem' } },
  { label: 'Dates', part: { kind: 'details' } },
  { label: 'Discount & tax', part: { kind: 'totals' } },
  { label: 'Notes', part: { kind: 'notes' } },
]

/**
 * The invoice as it really is; "Edit" switches to edit mode, where each part of the paper can
 * be clicked and nothing is saved until "Save".
 */
function Editor({ invoice }: { invoice: LoadedInvoice }) {
  const clients = useQuery(api.clients.list)
  const remembered = useQuery(api.items.list)
  const update = useMutation(api.invoices.update)
  const remember = useMutation(api.items.rememberFromInvoice)
  const navigate = useNavigate()
  const { markUnpaid } = useInvoiceActions()
  const [edit, setEdit] = useState<Edit | null>(null)
  const [saving, setSaving] = useState(false)
  const [numberError, setNumberError] = useState<string>()
  const [open, setOpen] = useState<OpenPart>(null)
  const [paying, setPaying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const saved = useMemo(() => toDraft(invoice), [invoice])
  const draft = edit?.draft ?? saved
  const dirty =
    edit !== null &&
    (edit.templateId !== invoice.templateId || JSON.stringify(edit.draft) !== JSON.stringify(saved))

  // Leaving with unsaved changes asks first (in the app, and when closing the tab).
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  })

  const change = useCallback((patch: Partial<InvoiceContent>) => {
    setEdit((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev))
    if ('number' in patch) setNumberError(undefined)
  }, [])

  function startEditing() {
    setEdit({ draft: saved, templateId: invoice.templateId, logoUrl: invoice.logoUrl })
  }

  function stopEditing() {
    setEdit(null)
    setOpen(null)
    setNumberError(undefined)
    setConfirmDiscard(false)
  }

  function cancel() {
    if (dirty) setConfirmDiscard(true)
    else stopEditing()
  }

  async function save() {
    if (!edit) return
    setSaving(true)
    try {
      await update({
        id: invoice._id,
        content: edit.draft,
        ...(edit.templateId && edit.templateId !== invoice.templateId
          ? { templateId: edit.templateId }
          : {}),
      })
      stopEditing()
      toast.success('Saved')
      // Remember the items for next time (on Save, so half-typed text never is).
      void remember({ invoiceId: invoice._id }).catch(() => undefined)
    } catch (error) {
      if (errorCode(error) === 'number_taken') {
        setNumberError(errorMessage(error))
        setOpen({ kind: 'details' })
      } else {
        toast.error(errorMessage(error, "Couldn't save the invoice."))
      }
    } finally {
      setSaving(false)
    }
  }

  /** Open a part of the paper. "Add item" adds a blank item and opens it. */
  const openPart = useCallback((part: EditPart) => {
    if (part.kind === 'addItem') {
      const item = newItem()
      setEdit((prev) =>
        prev ? { ...prev, draft: { ...prev.draft, items: [...prev.draft.items, item] } } : prev,
      )
      setOpen({ kind: 'item', id: item.id })
      return
    }
    setOpen(part)
  }, [])

  /** Closing drops items left completely empty (e.g. "Add item" then nothing typed). */
  const closePart = useCallback(() => {
    setOpen(null)
    setEdit((prev) => {
      if (!prev) return prev
      const items = prev.draft.items.filter((item) => !isBlankItem(item))
      return items.length === prev.draft.items.length
        ? prev
        : { ...prev, draft: { ...prev.draft, items } }
    })
  }, [])

  // The live status comes from the server (it's changed by its own actions, not the draft).
  const document: DocumentInvoice = useMemo(
    () => ({ ...draft, status: invoice.status, paidAt: invoice.paidAt }),
    [draft, invoice.status, invoice.paidAt],
  )
  const logoUrl = edit?.logoUrl ?? invoice.logoUrl

  async function download() {
    void remember({ invoiceId: invoice._id }).catch(() => undefined)
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
          aria-label="Back to invoices"
          title="Back to invoices"
          className="-ml-2.5 inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-text sm:size-9"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <div className="flex min-w-0 items-center gap-2.5">
          <InvoiceName
            name={draft.name ?? ''}
            number={draft.number}
            {...(edit ? { onRename: (name: string) => change({ name }) } : {})}
          />
          {/* In edit mode the title stays plain: Cancel / Save say enough. */}
          {edit ? null : <StatusPill status={invoice.status} />}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {edit ? (
            <>
              <Button variant="secondary" size="sm" onClick={cancel}>
                Cancel
              </Button>
              <Button size="sm" loading={saving} onClick={() => void save()}>
                {saving ? null : <Check />} Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Delete invoice"
                onClick={() => setConfirmDelete(true)}
                className="hover:bg-danger-bg hover:text-danger max-sm:size-11 max-sm:px-0"
              >
                <Trash2 /> <span className="max-sm:hidden">Delete</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={startEditing}
                className="max-sm:size-11 max-sm:px-0"
              >
                <PenLine /> <span className="max-sm:sr-only">Edit</span>
              </Button>
              {invoice.status === 'paid' ? (
                <>
                  <span className="hidden text-[13px] text-muted lg:inline">
                    Paid {formatDate(invoice.paidAt, 'd MMM yyyy')}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void markUnpaid(invoice._id)}
                  >
                    <CircleDashed /> <span className="max-sm:sr-only">Mark as unpaid</span>
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setPaying(true)}>
                  <CircleCheck /> <span className="max-sm:sr-only">Mark as paid</span>
                </Button>
              )}
              <Button size="sm" onClick={() => void download()}>
                <Download /> <span className="max-sm:sr-only">Download PDF</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {edit ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
              <TemplateSwitcher
                templateId={edit.templateId}
                onSwitch={(template) => {
                  setEdit((prev) =>
                    prev
                      ? {
                          draft: switchTemplate(prev.draft, template),
                          templateId: template._id,
                          logoUrl: template.logoUrl,
                        }
                      : prev,
                  )
                }}
              />
              <Button variant="ghost" size="sm" onClick={() => setOpen({ kind: 'look' })}>
                <Palette /> Look &amp; columns
              </Button>
            </div>
            <p className="m-0 flex items-center gap-1.5 text-[13px] text-muted">
              <MousePointerClick aria-hidden="true" className="size-4" />
              Click any part of the invoice to change it.
            </p>
          </div>

          {/* On a phone the paper is small: big buttons for the parts you change most. */}
          <div
            className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
            aria-label="Quick edit"
            role="group"
          >
            {QUICK_PARTS.map(({ label, part }) => (
              <Button key={label} variant="secondary" size="sm" onClick={() => openPart(part)}>
                {label}
              </Button>
            ))}
          </div>
        </>
      ) : null}

      <section aria-label="Preview" className="mx-auto w-full max-w-[794px]">
        <PaperPreview>
          <InvoiceDocument
            invoice={document}
            logoUrl={logoUrl}
            {...(edit ? { onEdit: openPart } : {})}
          />
        </PaperPreview>
      </section>

      <PartDialog
        open={edit ? open : null}
        onClose={closePart}
        draft={draft}
        document={document}
        logoUrl={logoUrl}
        isPaid={invoice.status === 'paid'}
        numberError={numberError}
        clients={clients}
        remembered={remembered ?? []}
        onChange={change}
      />

      <DiscardDialog
        open={confirmDiscard || blocker.status === 'blocked'}
        onKeep={() => {
          setConfirmDiscard(false)
          blocker.reset?.()
        }}
        onDiscard={() => {
          if (blocker.status === 'blocked') blocker.proceed()
          else stopEditing()
        }}
      />
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

/** "Discard your changes?" — when cancelling or leaving with unsaved edits. */
function DiscardDialog({
  open,
  onKeep,
  onDiscard,
}: {
  open: boolean
  onKeep: () => void
  onDiscard: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onKeep()
      }}
      title="Discard your changes?"
      description="You have changes that aren't saved yet."
      footer={
        <>
          <Button variant="secondary" onClick={onKeep}>
            Keep editing
          </Button>
          <Button variant="danger" onClick={onDiscard}>
            Discard changes
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm text-muted">The invoice stays as it was before you edited it.</p>
    </Dialog>
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
