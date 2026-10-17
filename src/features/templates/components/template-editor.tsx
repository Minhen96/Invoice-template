import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import type { TemplateFields } from '@convex/lib/validators'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, Copy, FilePlus2, MoreHorizontal, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { InvoiceDocument, PaperPreview, sampleInvoice } from '@/components/document'
import { ColumnsEditor } from '@/components/shared/columns-editor'
import { DocumentSettingsFields } from '@/components/shared/document-fields'
import { LookPicker } from '@/components/shared/look-picker'
import { SaveIndicator } from '@/components/shared/save-indicator'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Field, SelectField, TextAreaField } from '@/components/ui/field'
import { Menu } from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAutosave } from '@/hooks/use-autosave'
import { useNewInvoice } from '@/hooks/new-invoice-context'
import { errorMessage } from '@/lib/errors'
import { asBusiness, asPayment, pickRow } from '@/lib/parties'
import { today } from '@/lib/today'

import { DeleteTemplateDialog } from './delete-template-dialog'
import { LogoField } from './logo-field'

const DUE_OPTIONS = [
  { value: 'none', label: 'No due date' },
  { value: '0', label: 'On receipt' },
  ...[7, 14, 30, 45, 60].map((days) => ({ value: String(days), label: `${String(days)} days` })),
]

/** The template's fields plus which business / bank account it uses (unset = the default). */
type TemplateDraft = TemplateFields & {
  businessId?: Id<'businesses'> | undefined
  bankAccountId?: Id<'bankAccounts'> | undefined
}

function toFields(template: Doc<'templates'>): TemplateDraft {
  return {
    businessId: template.businessId,
    bankAccountId: template.bankAccountId,
    name: template.name,
    layout: template.layout,
    accent: template.accent,
    title: template.title,
    currency: template.currency,
    dateFormat: template.dateFormat,
    dueDays: template.dueDays,
    columns: template.columns,
    notes: template.notes,
  }
}

export function TemplateEditorPage({ id }: { id: string }) {
  const template = useQuery(api.templates.get, { id })
  if (template === undefined) {
    return (
      <div role="status" aria-label="Loading template" className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (template === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="m-0 font-medium">This template doesn&apos;t exist.</p>
        <Link to="/templates" className="font-medium underline underline-offset-4">
          Back to templates
        </Link>
      </div>
    )
  }
  return <TemplateEditor key={template._id} template={template} />
}

function TemplateEditor({ template }: { template: Doc<'templates'> & { logoUrl: string | null } }) {
  const update = useMutation(api.templates.update)
  const businesses = useQuery(api.businesses.list)
  const banks = useQuery(api.bankAccounts.list)
  const duplicate = useMutation(api.templates.duplicate)
  const navigate = useNavigate()
  const newInvoice = useNewInvoice()
  const [draft, setDraft] = useState<TemplateDraft>(() => toFields(template))
  const [deleting, setDeleting] = useState(false)
  const save = useCallback(
    (fields: TemplateDraft) => update({ id: template._id, ...fields }),
    [update, template._id],
  )
  const { state, error, flush } = useAutosave(draft, save)
  const change = (patch: Partial<TemplateDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }
  const business = pickRow(businesses, draft.businessId)
  const bank = pickRow(banks, draft.bankAccountId)
  const preview = useMemo(
    () =>
      sampleInvoice(draft, today(), { business: asBusiness(business), payment: asPayment(bank) }),
    [draft, business, bank],
  )

  async function copy() {
    await flush()
    try {
      const id = await duplicate({ id: template._id })
      toast.success('Template copied')
      await navigate({ to: '/templates/$id', params: { id } })
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't copy the template."))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Link
          to="/templates"
          aria-label="Back to templates"
          title="Back to templates"
          className="-ml-2.5 inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-text sm:size-9"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <h1 className="m-0 truncate text-xl font-semibold tracking-tight">
          {draft.name.trim() || 'Untitled template'}
        </h1>
        <SaveIndicator state={state} message={error?.message} onRetry={() => void flush()} />
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              void flush().then(() => {
                newInvoice({ templateId: template._id })
              })
            }}
          >
            <FilePlus2 /> <span className="max-sm:sr-only">New invoice with this</span>
          </Button>
          <Menu
            trigger={
              <Button variant="secondary" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            }
            items={[
              { label: 'Duplicate', icon: <Copy />, onSelect: () => void copy() },
              'separator',
              {
                label: 'Delete',
                icon: <Trash2 />,
                danger: true,
                onSelect: () => setDeleting(true),
              },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          <SectionCard title="Look">
            <Field
              label="Template name"
              hint="Only you see this, e.g. “Astro announcer”."
              wrapperClassName="mb-5"
              value={draft.name}
              maxLength={60}
              error={
                error?.code === 'invalid' && draft.name.trim() === ''
                  ? 'Give it a name.'
                  : undefined
              }
              onChange={(e) => change({ name: e.target.value })}
            />
            <LookPicker
              layout={draft.layout}
              accent={draft.accent}
              preview={preview}
              logoUrl={template.logoUrl}
              onChange={change}
            />
            <div className="mt-5">
              <LogoField templateId={template._id} logoUrl={template.logoUrl} />
            </div>
          </SectionCard>

          <SectionCard
            title="Business & bank account"
            description="Who the invoice is from and where clients pay. Manage them in Account."
          >
            <div className="flex flex-col gap-4">
              <PartySelect
                label="Business"
                rows={businesses}
                chosen={draft.businessId}
                describe={(row) => row.name || 'Unnamed business'}
                onChange={(id) => change({ businessId: id as Id<'businesses'> | undefined })}
              />
              <PartySelect
                label="Bank account"
                rows={banks}
                chosen={draft.bankAccountId}
                describe={(row) =>
                  [row.bankName, row.accountNumber].filter(Boolean).join(' · ') || 'Unnamed account'
                }
                onChange={(id) => change({ bankAccountId: id as Id<'bankAccounts'> | undefined })}
              />
            </div>
          </SectionCard>

          <SectionCard title="Invoice details">
            <div className="flex flex-col gap-4">
              <DocumentSettingsFields value={draft} sampleDate={today()} onChange={change} />
              <SelectField
                label="Payment due"
                value={draft.dueDays === null ? 'none' : String(draft.dueDays)}
                onChange={(e) =>
                  change({ dueDays: e.target.value === 'none' ? null : Number(e.target.value) })
                }
              >
                {DUE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                label="Notes"
                hint="Printed under the totals. A saved client's own notes are used instead when set."
                rows={3}
                maxLength={2000}
                value={draft.notes}
                onChange={(e) => change({ notes: e.target.value })}
              />
            </div>
          </SectionCard>

          <SectionCard title="Items table" description="What each item shows on the invoice.">
            <ColumnsEditor
              columns={draft.columns}
              currency={draft.currency}
              onChange={(columns) => change({ columns })}
            />
          </SectionCard>
        </div>

        <section aria-label="Preview" className="lg:sticky lg:top-24">
          <PaperPreview>
            <InvoiceDocument invoice={preview} logoUrl={template.logoUrl} />
          </PaperPreview>
          <p className="m-0 mt-3 text-center text-[13px] text-muted">
            Preview with example client and item.
          </p>
        </section>
      </div>

      <DeleteTemplateDialog
        template={deleting ? { _id: template._id, name: draft.name } : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => void navigate({ to: '/templates' })}
      />
    </div>
  )
}

/**
 * Pick a business / bank account for this template. "Default" follows whichever one is the
 * default in Account, so changing the default there updates every template that uses it.
 */
function PartySelect<T extends { _id: string; isDefault: boolean }>({
  label,
  rows,
  chosen,
  describe,
  onChange,
}: {
  label: string
  rows: T[] | undefined
  chosen: string | undefined
  describe: (row: T) => string
  onChange: (id: string | undefined) => void
}) {
  if (rows === undefined) return <Skeleton className="h-16" />
  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <p className="m-0 text-sm">
          None yet.{' '}
          <Link to="/account" className="font-medium underline underline-offset-4">
            Add one in Account
          </Link>
        </p>
      </div>
    )
  }
  const fallback = rows.find((row) => row.isDefault) ?? rows[0]
  const value = rows.some((row) => row._id === chosen) ? (chosen ?? '') : ''
  return (
    <SelectField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
    >
      <option value="">Default{fallback ? ` — ${describe(fallback)}` : ''}</option>
      {rows.map((row) => (
        <option key={row._id} value={row._id}>
          {describe(row)}
        </option>
      ))}
    </SelectField>
  )
}
