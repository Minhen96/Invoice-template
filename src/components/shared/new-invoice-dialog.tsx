import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { addDays, formatDate, isIsoDate } from '@convex/lib/dates'
import { computeTotals } from '@convex/lib/invoiceMath'
import { formatSen } from '@convex/lib/money'
import { firstInvoiceNumber } from '@convex/lib/numbering'
import type { LineItem } from '@convex/lib/validators'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Plus } from 'lucide-react'
import { useCallback, useId, useState, type ReactNode, type SyntheticEvent } from 'react'
import { toast } from 'sonner'

import {
  InvoiceDocument,
  PaperPreview,
  sampleInvoice,
  type DocumentInvoice,
} from '@/components/document'
import { ClientDialog } from '@/components/shared/client-dialog'
import { CompactItemHeader, CompactItemRow } from '@/components/shared/item-row'
import { ParsedInput } from '@/components/shared/number-input'
import { BankAccountDialog, BusinessDialog } from '@/components/shared/party-dialogs'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, inputClass, SelectField, TextAreaField } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { NewInvoiceContext, type NewInvoiceOptions } from '@/hooks/new-invoice-context'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { isBlankItem, newItem } from '@/lib/line-items'
import { money, percent } from '@/lib/parse'
import { asBusiness, asPayment, pickRow } from '@/lib/parties'
import { today } from '@/lib/today'

/**
 * "New invoice": pick a template and a client (both pre-picked to the last ones used), the
 * business and bank account (pre-picked from the template), the date (today), items, remark and
 * optional discount / tax, with a live preview beside them. All of it stays editable on the
 * invoice afterwards.
 */
export function NewInvoiceProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<NewInvoiceOptions | null>(null)
  const open = useCallback((next: NewInvoiceOptions = {}) => {
    setOptions(next)
  }, [])
  const close = () => {
    setOptions(null)
  }

  return (
    <NewInvoiceContext.Provider value={open}>
      {children}
      <Dialog
        open={options !== null}
        onOpenChange={(next) => {
          if (!next) close()
        }}
        title="New invoice"
        className="sm:max-w-3xl lg:max-w-4xl"
      >
        {options ? <NewInvoiceForm options={options} onDone={close} /> : null}
      </Dialog>
    </NewInvoiceContext.Provider>
  )
}

function NewInvoiceForm({ options, onDone }: { options: NewInvoiceOptions; onDone: () => void }) {
  const templates = useQuery(api.templates.list)
  const clients = useQuery(api.clients.list)
  const profile = useQuery(api.profiles.get)
  const businesses = useQuery(api.businesses.list)
  const banks = useQuery(api.bankAccounts.list)
  const remembered = useQuery(api.items.list)

  if (
    templates === undefined ||
    clients === undefined ||
    profile === undefined ||
    businesses === undefined ||
    banks === undefined
  ) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }
  if (templates.length === 0) return <FirstTemplate onDone={onDone} />

  const known = <T extends string>(id: T | null | undefined, ids: readonly string[]) =>
    id && ids.includes(id) ? id : undefined
  const templateIds = templates.map((t) => t._id)
  const clientIds = clients.map((c) => c._id)
  const defaultTemplate =
    known(options.templateId, templateIds) ??
    known(profile?.lastTemplateId, templateIds) ??
    templates[0]?._id
  // A saved client is always picked: the one asked for, else the last used, else the first.
  const defaultClient =
    known(options.clientId, clientIds) ??
    known(profile?.lastClientId, clientIds) ??
    clients[0]?._id ??
    ''

  return (
    <ChooseForm
      templates={templates}
      clients={clients}
      businesses={businesses}
      banks={banks}
      remembered={remembered ?? []}
      // No profile yet: the first invoice gets the year's first number.
      nextNumber={profile?.nextNumber ?? firstInvoiceNumber(today())}
      defaultTemplate={defaultTemplate ?? ''}
      defaultClient={defaultClient}
      onDone={onDone}
    />
  )
}

interface ChooseFormProps {
  templates: (Doc<'templates'> & { logoUrl: string | null })[]
  clients: Doc<'clients'>[]
  businesses: Doc<'businesses'>[]
  banks: Doc<'bankAccounts'>[]
  /** Past items, offered as suggestions while typing. */
  remembered: readonly Doc<'items'>[]
  /** The number the new invoice will get (shown in the preview). */
  nextNumber: string
  defaultTemplate: string
  defaultClient: string
  onDone: () => void
}

function ChooseForm({
  templates,
  clients,
  businesses,
  banks,
  remembered,
  nextNumber,
  defaultTemplate,
  defaultClient,
  onDone,
}: ChooseFormProps) {
  const create = useMutation(api.invoices.create)
  const navigate = useNavigate()
  const formId = useId()
  const [templateId, setTemplateId] = useState(defaultTemplate)
  const [clientId, setClientId] = useState(defaultClient)
  // null = whatever the template uses; picking another template resets these.
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [bankId, setBankId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [issueDate, setIssueDate] = useState(today)
  const [due, setDue] = useState<DueChoice>('none')
  const [customDue, setCustomDue] = useState('')
  const [items, setItems] = useState<LineItem[]>(() => [newItem()])
  // null = the client's usual notes, else the template's; typing takes over.
  const [notes, setNotes] = useState<string | null>(null)
  const [discountOn, setDiscountOn] = useState(false)
  const [discountSen, setDiscountSen] = useState(0)
  const [taxOn, setTaxOn] = useState(false)
  const [taxRateBps, setTaxRateBps] = useState(0)
  const [taxLabel, setTaxLabel] = useState('SST')
  const [creating, setCreating] = useState(false)
  const [adding, setAdding] = useState<'business' | 'bank' | 'client' | null>(null)

  const template = templates.find((t) => t._id === templateId) ?? templates[0]
  const client = clients.find((c) => c._id === clientId)
  const business = pickRow(businesses, businessId ?? template?.businessId)
  const bank = pickRow(banks, bankId ?? template?.bankAccountId)
  const dateOk = isIsoDate(issueDate)
  const dueDate = dueDateFor(due, dateOk ? issueDate : '', customDue)
  // A custom due date must be a real date, not before the invoice date.
  const dueOk = due !== 'custom' || (isIsoDate(customDue) && (!dateOk || customDue >= issueDate))
  const usualNotes = client && client.notes !== '' ? client.notes : (template?.notes ?? '')
  const extras = {
    items: items.filter((item) => !isBlankItem(item)),
    notes: notes ?? usualNotes,
    discountSen: discountOn ? discountSen : 0,
    taxRateBps: taxOn ? taxRateBps : 0,
    taxLabel: taxOn ? taxLabel : 'SST',
  }
  const totals = computeTotals(extras)
  const currency = template?.currency.trim() ?? ''
  const amount = (sen: number) => `${currency} ${formatSen(sen)}`.trim()
  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  async function submit(event: SyntheticEvent) {
    event.preventDefault()
    if (!template || !dateOk || !dueOk) return
    setCreating(true)
    try {
      const id = await create({
        today: today(),
        templateId: template._id,
        issueDate,
        dueDate,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(client ? { clientId: client._id } : {}),
        ...(business ? { businessId: business._id } : {}),
        ...(bank ? { bankAccountId: bank._id } : {}),
        ...extras,
      })
      onDone()
      await navigate({ to: '/invoices/$id', params: { id } })
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't create the invoice."))
      setCreating(false)
    }
  }

  const preview: DocumentInvoice | null = template
    ? {
        ...sampleInvoice(template, dateOk ? issueDate : today(), {
          business: asBusiness(business),
          payment: asPayment(bank),
        }),
        number: nextNumber,
        dueDate,
        ...extras,
        ...(client
          ? {
              billTo: { name: client.name, address: client.address, attention: client.attention },
            }
          : {}),
      }
    : null

  return (
    <>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
        {/* Who, what and when, with the live preview beside. */}
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
          <div className="flex flex-col gap-4 max-sm:order-2">
            <Field
              label="Invoice name (optional)"
              hint="Only for you, to find it later. Not printed."
              placeholder="e.g. Astro – Oct 2026"
              value={name}
              maxLength={200}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
            <SelectField
              label="Template"
              value={template?._id ?? ''}
              onChange={(e) => {
                setTemplateId(e.target.value)
                setBusinessId(null)
                setBankId(null)
              }}
            >
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </SelectField>
            <PartyChoice
              label="Your business"
              rows={businesses}
              value={business?._id}
              describe={(row) => row.name || 'Unnamed business'}
              onChange={setBusinessId}
              empty={{
                title: 'No business yet',
                text: 'Who the invoice is from. Saved for next time.',
                addLabel: 'Add business',
                onAdd: () => setAdding('business'),
              }}
            />
            <PartyChoice
              label="Your bank account"
              rows={banks}
              value={bank?._id}
              describe={(row) =>
                [row.bankName, row.accountNumber].filter(Boolean).join(' · ') || 'Unnamed account'
              }
              onChange={setBankId}
              empty={{
                title: 'No bank account yet',
                text: 'Where clients pay you. Saved for next time.',
                addLabel: 'Add bank account',
                onAdd: () => setAdding('bank'),
              }}
            />
            {clients.length === 0 ? (
              <EmptyChoice
                label="Client"
                title="No saved clients yet"
                text="Add one now, or just type the client on the invoice."
                addLabel="Add client"
                onAdd={() => setAdding('client')}
              />
            ) : (
              <SelectField
                label="Client"
                value={client?._id ?? ''}
                onChange={(e) => {
                  if (e.target.value === ADD) setAdding('client')
                  else setClientId(e.target.value)
                }}
              >
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
                <option value={ADD}>+ Add client…</option>
              </SelectField>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Invoice date"
                type="date"
                required
                value={issueDate}
                error={dateOk ? undefined : 'Pick a date.'}
                onChange={(e) => {
                  setIssueDate(e.target.value)
                }}
              />
              {due === 'custom' ? (
                // Same spot as the list: a date box that opens its calendar straight away.
                <Field
                  label="Due date"
                  type="date"
                  required
                  value={customDue}
                  min={dateOk ? issueDate : undefined}
                  error={dueOk ? undefined : 'Pick a due date on or after the invoice date.'}
                  ref={openPicker}
                  labelAside={
                    <button
                      type="button"
                      onClick={() => {
                        setDue('none')
                        setCustomDue('')
                      }}
                      className="-my-2 flex min-h-11 items-center px-1 text-[12.5px] font-medium text-muted underline-offset-4 hover:text-text hover:underline sm:min-h-9"
                    >
                      Choose from list
                    </button>
                  }
                  onChange={(e) => {
                    setCustomDue(e.target.value)
                  }}
                />
              ) : (
                <SelectField
                  label="Payment due"
                  value={due}
                  hint={
                    dueDate !== '' && template
                      ? `Due ${formatDate(dueDate, template.dateFormat)}`
                      : undefined
                  }
                  onChange={(e) => {
                    setDue(e.target.value as DueChoice)
                  }}
                >
                  {DUE_CHOICES.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </SelectField>
              )}
            </div>
          </div>
          {preview && template ? (
            // Decorative: everything it shows is chosen in the fields beside it.
            <div
              aria-hidden="true"
              data-testid="new-invoice-preview"
              className="mx-auto w-full max-w-44 self-start rounded-xl bg-sunken p-3 max-sm:order-1 sm:sticky sm:top-0 sm:max-w-none"
            >
              <PaperPreview>
                <InvoiceDocument invoice={preview} logoUrl={template.logoUrl} />
              </PaperPreview>
            </div>
          ) : null}
        </div>

        {template ? (
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-[13px] font-medium text-muted">Items</legend>
            <div className="overflow-hidden rounded-xl border border-line">
              <CompactItemHeader columns={template.columns} currency={template.currency} />
              {items.length > 0 ? (
                <ol className="m-0 list-none p-0">
                  {items.map((item, index) => (
                    <CompactItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      columns={template.columns}
                      currency={template.currency}
                      remembered={remembered}
                      onChange={(patch) => {
                        updateItem(index, patch)
                      }}
                      onRemove={() => {
                        setItems((prev) => prev.filter((_, i) => i !== index))
                      }}
                    />
                  ))}
                </ol>
              ) : (
                <p className="m-0 px-3 py-4 text-sm text-muted">No items yet.</p>
              )}
              <div className="border-t border-line bg-raised px-1.5 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={items.length >= 100}
                  onClick={() => {
                    setItems((prev) => [...prev, newItem()])
                  }}
                >
                  <Plus /> Add item
                </Button>
              </div>
            </div>
          </fieldset>
        ) : null}

        {/* Like the bottom of an invoice: remark on the left, totals on the right. */}
        <div className="grid gap-5 md:grid-cols-2">
          <TextAreaField
            label="Remark"
            hint="Printed under the totals."
            value={notes ?? usualNotes}
            maxLength={2000}
            rows={2}
            onChange={(e) => {
              setNotes(e.target.value)
            }}
          />
          <div className="flex flex-col gap-1 self-start rounded-xl border border-line bg-raised px-4 py-3 text-sm">
            <TotalLine label="Subtotal" value={amount(totals.subtotalSen)} />
            <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1">
              <Tick label="Discount" checked={discountOn} onChange={setDiscountOn} />
              {discountOn ? (
                <>
                  <label htmlFor={`${formId}-discount`} className="sr-only">
                    Discount amount {currency ? `(${currency})` : ''}
                  </label>
                  <ParsedInput
                    id={`${formId}-discount`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={discountSen}
                    parse={money.parse}
                    format={money.format}
                    invalidMessage="Use a plain amount like 250 or 1,250.50"
                    onValueChange={setDiscountSen}
                    className="w-28 sm:h-9 sm:text-sm"
                  />
                  <span className="ml-auto tabular">−{amount(totals.discountSen)}</span>
                </>
              ) : null}
            </div>
            <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1">
              <Tick label="Tax" checked={taxOn} onChange={setTaxOn} />
              {taxOn ? (
                <>
                  <label htmlFor={`${formId}-tax`} className="sr-only">
                    Tax %
                  </label>
                  <ParsedInput
                    id={`${formId}-tax`}
                    inputMode="decimal"
                    placeholder="0"
                    value={taxRateBps}
                    parse={percent.parse}
                    format={percent.format}
                    invalidMessage="Use a percentage from 0 to 100"
                    onValueChange={setTaxRateBps}
                    className="w-16 sm:h-9 sm:text-sm"
                  />
                  <span aria-hidden="true" className="text-muted">
                    %
                  </span>
                  <label htmlFor={`${formId}-tax-name`} className="sr-only">
                    Tax name
                  </label>
                  <input
                    id={`${formId}-tax-name`}
                    value={taxLabel}
                    maxLength={40}
                    placeholder="SST"
                    onChange={(e) => {
                      setTaxLabel(e.target.value)
                    }}
                    className={cn(inputClass, 'h-11 w-20 sm:h-9 sm:text-sm')}
                  />
                  <span className="ml-auto tabular">{amount(totals.taxSen)}</span>
                </>
              ) : null}
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-base font-semibold">
              <span>Total</span>
              <span className="tabular">{amount(totals.totalSen)}</span>
            </div>
          </div>
        </div>

        {/* Stays in view while the form scrolls. */}
        <div className="sticky -bottom-4 -mx-5 -mb-4 flex flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={creating} disabled={!dateOk || !dueOk}>
            Create invoice
          </Button>
        </div>
      </form>
      {/* Outside the form: their own forms' submit events would otherwise reach this one. */}
      <BusinessDialog
        target={adding === 'business' ? 'new' : null}
        onClose={() => setAdding(null)}
        onCreated={setBusinessId}
      />
      <BankAccountDialog
        target={adding === 'bank' ? 'new' : null}
        onClose={() => setAdding(null)}
        onCreated={setBankId}
      />
      <ClientDialog
        client={adding === 'client' ? 'new' : null}
        onClose={() => setAdding(null)}
        onCreated={setClientId}
      />
    </>
  )
}

function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  )
}

/** A checkbox with a 44px tap area. */
function Tick({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-11 w-24 shrink-0 cursor-pointer items-center gap-3 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked)
        }}
        className="size-5 accent-ink"
      />
      {label}
    </label>
  )
}

/** The last option of each list: opens the add form instead of choosing. */
const ADD = '__add'

type DueChoice = 'none' | '7' | '30' | '90' | 'custom'

const DUE_CHOICES: readonly { value: DueChoice; label: string }[] = [
  { value: 'none', label: 'No due date' },
  { value: '7', label: 'In 7 days' },
  { value: '30', label: 'In 30 days' },
  { value: '90', label: 'In 90 days' },
  { value: 'custom', label: 'Custom…' },
]

/** The due date for a choice: '' for none (or while the invoice date is unset). */
/** Focus the custom due date and open its calendar (where the browser allows it). */
function openPicker(input: HTMLInputElement | null) {
  if (!input) return
  input.focus()
  try {
    input.showPicker()
  } catch {
    // Not supported, or no recent click: the focused box is enough.
  }
}

function dueDateFor(choice: DueChoice, issueDate: string, custom: string): string {
  if (choice === 'none') return ''
  if (choice === 'custom') return isIsoDate(custom) ? custom : ''
  return issueDate === '' ? '' : addDays(issueDate, Number(choice))
}

interface EmptyChoiceProps {
  label: string
  title: string
  text: string
  addLabel: string
  onAdd: () => void
}

/** Nothing to choose yet: say so, and offer to add one right here. */
function EmptyChoice({ label, title, text, addLabel, onAdd }: EmptyChoiceProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line-strong bg-raised px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-medium">{title}</p>
          <p className="m-0 mt-0.5 text-[13px] text-muted">{text}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <Plus /> {addLabel}
        </Button>
      </div>
    </div>
  )
}

/** Pick a business / bank account, the default one marked. None yet: add one on the spot. */
function PartyChoice<T extends { _id: string; isDefault: boolean }>({
  label,
  rows,
  value,
  describe,
  onChange,
  empty,
}: {
  label: string
  rows: T[]
  value: string | undefined
  describe: (row: T) => string
  onChange: (id: string) => void
  empty: Omit<EmptyChoiceProps, 'label'>
}) {
  if (rows.length === 0) return <EmptyChoice label={label} {...empty} />
  return (
    <SelectField
      label={label}
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value === ADD) empty.onAdd()
        else onChange(e.target.value)
      }}
    >
      {rows.map((row) => (
        <option key={row._id} value={row._id}>
          {describe(row)}
          {row.isDefault ? ' (default)' : ''}
        </option>
      ))}
      <option value={ADD}>+ {empty.addLabel}…</option>
    </SelectField>
  )
}

/** No template yet: one is needed first (it holds how the invoice looks). */
function FirstTemplate({ onDone }: { onDone: () => void }) {
  const create = useMutation(api.templates.create)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  async function start() {
    setCreating(true)
    try {
      const id = await create({})
      onDone()
      await navigate({ to: '/templates/$id', params: { id } })
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't create the template."))
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 max-w-prose text-sm text-muted">
        First, set up your invoice template once: your business and bank details and how the invoice
        looks. Every invoice after that takes a few seconds.
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Later
        </Button>
        <Button loading={creating} onClick={() => void start()}>
          Set up template
        </Button>
      </div>
    </div>
  )
}
