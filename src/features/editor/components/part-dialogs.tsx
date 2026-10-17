import type { Doc } from '@convex/_generated/dataModel'
import { computeTotals } from '@convex/lib/invoiceMath'
import { formatSen } from '@convex/lib/money'
import type { InvoiceContent, LineItem } from '@convex/lib/validators'
import type { ReactNode } from 'react'

import type { DocumentInvoice, EditPart } from '@/components/document'
import { ColumnsEditor } from '@/components/shared/columns-editor'
import { DocumentSettingsFields } from '@/components/shared/document-fields'
import { ItemRow } from '@/components/shared/item-row'
import { LookPicker } from '@/components/shared/look-picker'
import { ParsedInput } from '@/components/shared/number-input'
import { BusinessFields, PaymentFields } from '@/components/shared/party-fields'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, TextAreaField } from '@/components/ui/field'
import { moveItem } from '@/lib/line-items'
import { money, percent } from '@/lib/parse'

import { BillToSection } from './bill-to-section'
import { DatesSection } from './dates-section'

/** What's open: one part of the paper, or the "Look & columns" settings. */
export type OpenPart = EditPart | { kind: 'look' } | null

interface PartDialogProps {
  open: OpenPart
  onClose: () => void
  draft: InvoiceContent
  document: DocumentInvoice
  logoUrl: string | null
  isPaid: boolean
  numberError: string | undefined
  clients: Doc<'clients'>[] | undefined
  remembered: readonly Doc<'items'>[]
  onChange: (patch: Partial<InvoiceContent>) => void
}

const PER_INVOICE = 'Changes here apply to this invoice only.'

/**
 * The popup for whichever part of the paper was clicked. Edits apply to the paper as you type
 * (and autosave), so there's just "Done".
 */
export function PartDialog({ open, onClose, ...props }: PartDialogProps) {
  const content = open ? describe(open, props, onClose) : null
  return (
    <Dialog
      open={content !== null}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={content?.title ?? ''}
      description={content?.description}
      className="sm:max-w-lg"
      footer={
        <Button onClick={onClose} className="sm:min-w-28">
          Done
        </Button>
      }
    >
      {content?.body}
    </Dialog>
  )
}

function describe(
  part: Exclude<OpenPart, null>,
  {
    draft,
    document,
    logoUrl,
    isPaid,
    numberError,
    clients,
    remembered,
    onChange,
  }: Omit<PartDialogProps, 'open' | 'onClose'>,
  onClose: () => void,
): { title: string; description?: string; body: ReactNode } | null {
  switch (part.kind) {
    case 'billTo':
      return {
        title: 'Bill to',
        body: <BillToSection bare draft={draft} clients={clients} onChange={onChange} />,
      }
    case 'details':
      return {
        title: 'Number & dates',
        body: (
          <div className="flex flex-col gap-4">
            <Field
              label="Invoice number"
              value={draft.number}
              maxLength={50}
              error={numberError}
              onChange={(e) => onChange({ number: e.target.value })}
            />
            <DatesSection bare draft={draft} onChange={onChange} />
          </div>
        ),
      }
    case 'item':
    case 'addItem': {
      // "Add item" opens with the item just added (the last one).
      const index =
        part.kind === 'item'
          ? draft.items.findIndex((item) => item.id === part.id)
          : draft.items.length - 1
      const item = draft.items[index]
      if (!item) return null
      const setItems = (items: LineItem[]) => onChange({ items })
      return {
        title: `Item ${String(index + 1)}`,
        body: (
          <ol className="m-0 list-none p-0">
            <ItemRow
              item={item}
              index={index}
              count={draft.items.length}
              columns={draft.columns}
              currency={draft.currency}
              remembered={remembered}
              onChange={(patch) =>
                setItems(draft.items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
              }
              onMove={(by) => setItems(moveItem(draft.items, index, by))}
              onRemove={() => {
                setItems(draft.items.filter((_, i) => i !== index))
                onClose()
              }}
            />
          </ol>
        ),
      }
    }
    case 'totals':
      return {
        title: 'Discount & tax',
        description: 'Leave blank if not used.',
        body: <TotalsBody draft={draft} onChange={onChange} />,
      }
    case 'notes':
      return {
        title: 'Notes',
        description: 'Printed under the totals.',
        body: (
          <div className="flex flex-col gap-4">
            <TextAreaField
              label="Notes"
              value={draft.notes}
              maxLength={2000}
              rows={5}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
            {isPaid ? (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.showPaidStamp}
                  onChange={(e) => onChange({ showPaidStamp: e.target.checked })}
                  className="size-5 accent-ink"
                />
                Show a “PAID” stamp on the document
              </label>
            ) : null}
          </div>
        ),
      }
    case 'from':
      return {
        title: 'Your business',
        description: `${PER_INVOICE} Your usual details live in Account.`,
        body: (
          <div className="flex flex-col gap-4">
            <BusinessFields value={draft.from} onChange={(from) => onChange({ from })} />
          </div>
        ),
      }
    case 'payment':
      return {
        title: 'Payment details',
        description: `${PER_INVOICE} Your usual bank accounts live in Account.`,
        body: (
          <div className="flex flex-col gap-4">
            <PaymentFields value={draft.payment} onChange={(payment) => onChange({ payment })} />
          </div>
        ),
      }
    case 'look':
      return {
        title: 'Look & columns',
        description: `${PER_INVOICE} To change them for every new invoice, edit the template.`,
        body: (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <LookPicker
                layout={draft.layout}
                accent={draft.accent}
                preview={document}
                logoUrl={logoUrl}
                onChange={onChange}
              />
            </section>
            <DocumentSettingsFields
              value={draft}
              sampleDate={draft.issueDate}
              onChange={onChange}
            />
            <ColumnsEditor
              columns={draft.columns}
              currency={draft.currency}
              onChange={(columns) => onChange({ columns })}
            />
          </div>
        ),
      }
  }
}

function TotalsBody({
  draft,
  onChange,
}: {
  draft: InvoiceContent
  onChange: (patch: Partial<InvoiceContent>) => void
}) {
  const totals = computeTotals(draft)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="discount" className="text-[13px] font-medium text-muted">
          Discount
        </label>
        <ParsedInput
          id="discount"
          inputMode="decimal"
          placeholder="0.00"
          value={draft.discountSen}
          parse={money.parse}
          format={money.format}
          onValueChange={(discountSen) => onChange({ discountSen })}
        />
      </div>
      <div className="grid grid-cols-[0.6fr_1fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tax-rate" className="text-[13px] font-medium text-muted">
            Tax %
          </label>
          <ParsedInput
            id="tax-rate"
            inputMode="decimal"
            placeholder="0"
            value={draft.taxRateBps}
            parse={percent.parse}
            format={percent.format}
            invalidMessage="Use a percentage from 0 to 100"
            onValueChange={(taxRateBps) => onChange({ taxRateBps })}
          />
        </div>
        <Field
          label="Tax name"
          value={draft.taxLabel}
          maxLength={40}
          placeholder="SST"
          onChange={(e) => onChange({ taxLabel: e.target.value })}
        />
      </div>
      <p className="m-0 flex justify-between rounded-xl bg-raised p-4 text-base font-semibold">
        <span>Total</span>
        <span className="tabular" aria-live="polite">
          {draft.currency ? `${draft.currency} ` : ''}
          {formatSen(totals.totalSen)}
        </span>
      </p>
    </div>
  )
}
