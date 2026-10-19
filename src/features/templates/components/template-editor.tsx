import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { DEFAULT_TEMPLATE } from '@convex/lib/defaults'
import type { TemplateFields } from '@convex/lib/validators'
import { Link, useBlocker, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, Check, Copy, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { InvoiceDocument, PaperPreview, sampleInvoice } from '@/components/document'
import { ColumnsEditor } from '@/components/shared/columns-editor'
import { DocumentSettingsFields } from '@/components/shared/document-fields'
import { DiscardDialog } from '@/components/shared/discard-dialog'
import { LookPicker } from '@/components/shared/look-picker'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Field, SelectField, TextAreaField } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/errors'
import { asBusiness, asPayment, pickRow } from '@/lib/parties'
import { today } from '@/lib/today'

import { DeleteTemplateDialog } from './delete-template-dialog'
import { LogoField } from './logo-field'
import { useSaveLogo, type LogoChange } from './use-save-logo'

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

type LoadedTemplate = Doc<'templates'> & { logoUrl: string | null }

/** Where a new template starts: the usual defaults. */
const NEW_DRAFT: TemplateDraft = { ...DEFAULT_TEMPLATE, name: 'New template' }

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

/** A template that isn't stored until "Create template". */
export function NewTemplatePage() {
  return <TemplateEditor template={null} />
}

/**
 * Edit a template (or a new one, when `template` is null). Nothing is saved until
 * "Save changes" / "Create template"; Cancel, or leaving with changes, asks first.
 */
function TemplateEditor({ template }: { template: LoadedTemplate | null }) {
  const create = useMutation(api.templates.create)
  const update = useMutation(api.templates.update)
  const duplicate = useMutation(api.templates.duplicate)
  const saveLogo = useSaveLogo()
  const templates = useQuery(api.templates.list)
  const businesses = useQuery(api.businesses.list)
  const banks = useQuery(api.bankAccounts.list)
  const navigate = useNavigate()
  const saved = useMemo(() => (template ? toFields(template) : NEW_DRAFT), [template])
  const [draft, setDraft] = useState<TemplateDraft>(saved)
  const [logo, setLogo] = useState<LogoChange>(null)
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState<string>()
  const [deleting, setDeleting] = useState(false)
  // Set once saved, so going back to the list doesn't ask about the (just saved) changes.
  const done = useRef(false)

  const dirty = logo !== null || JSON.stringify(draft) !== JSON.stringify(saved)
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !done.current,
    enableBeforeUnload: () => dirty && !done.current,
    withResolver: true,
  })

  const change = (patch: Partial<TemplateDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    if ('name' in patch) setNameError(undefined)
  }
  const business = pickRow(businesses, draft.businessId)
  const bank = pickRow(banks, draft.bankAccountId)
  const logoUrl =
    logo?.kind === 'set'
      ? logo.previewUrl
      : logo?.kind === 'remove'
        ? null
        : (template?.logoUrl ?? null)
  const preview = useMemo(
    () =>
      sampleInvoice(draft, today(), { business: asBusiness(business), payment: asPayment(bank) }),
    [draft, business, bank],
  )

  const backToList = () => navigate({ to: '/templates' })

  async function save() {
    if (draft.name.trim() === '') {
      setNameError('Give it a name.')
      return
    }
    setSaving(true)
    let id: Id<'templates'>
    try {
      const { businessId, bankAccountId, ...fields } = draft
      if (template) {
        id = template._id
        await update({ id, ...draft })
      } else {
        id = await create({ fields, businessId, bankAccountId })
      }
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save the template."))
      setSaving(false)
      return
    }
    try {
      await saveLogo(id, logo)
      toast.success(template ? 'Template saved' : 'Template created')
    } catch (error) {
      toast.error(
        errorMessage(error, "Saved, but couldn't use that logo. Try a PNG or JPG under 1 MB."),
      )
    }
    done.current = true
    await backToList()
  }

  async function copy() {
    if (!template) return
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
        <h1 className="m-0 min-w-0 truncate text-xl font-semibold tracking-tight">
          {draft.name.trim() || 'Untitled template'}
        </h1>
        {template && dirty ? <span className="text-[13px] text-muted">Unsaved changes</span> : null}
        <div className="ml-auto flex items-center gap-2">
          {template && !dirty ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Duplicate template"
                onClick={() => void copy()}
                className="max-sm:size-11 max-sm:px-0"
              >
                <Copy /> <span className="max-sm:sr-only">Duplicate</span>
              </Button>
              {/* Your last template stays: every invoice starts from one. */}
              {(templates?.length ?? 0) > 1 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label="Delete template"
                  onClick={() => setDeleting(true)}
                  className="text-danger hover:bg-danger-bg max-sm:size-11 max-sm:px-0"
                >
                  <Trash2 /> <span className="max-sm:sr-only">Delete</span>
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => void backToList()}>
                Cancel
              </Button>
              <Button size="sm" loading={saving} onClick={() => void save()}>
                {saving ? null : <Check />} {template ? 'Save changes' : 'Create template'}
              </Button>
            </>
          )}
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
              error={nameError}
              onChange={(e) => change({ name: e.target.value })}
            />
            <LookPicker
              layout={draft.layout}
              accent={draft.accent}
              preview={preview}
              logoUrl={logoUrl}
              onChange={change}
            />
            <div className="mt-5">
              <LogoField logoUrl={logoUrl} onChange={setLogo} />
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
            <InvoiceDocument invoice={preview} logoUrl={logoUrl} />
          </PaperPreview>
          <p className="m-0 mt-3 text-center text-[13px] text-muted">
            Preview with example client and item.
          </p>
        </section>
      </div>

      <DiscardDialog
        open={blocker.status === 'blocked'}
        message={
          template
            ? 'The template stays as it was before you edited it.'
            : "The new template won't be created."
        }
        onKeep={() => blocker.reset?.()}
        onDiscard={() => blocker.proceed?.()}
      />
      <DeleteTemplateDialog
        template={deleting && template ? { _id: template._id, name: draft.name } : null}
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
