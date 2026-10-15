import { computeTotals } from '@convex/lib/invoiceMath'
import { formatSen } from '@convex/lib/money'
import type { InvoiceContent } from '@convex/lib/validators'

import { ParsedInput } from '@/components/shared/number-input'
import { SectionCard } from '@/components/ui/card'
import { Field, TextAreaField } from '@/components/ui/field'
import { money, percent } from '@/lib/parse'

interface ExtrasSectionProps {
  draft: InvoiceContent
  isPaid: boolean
  onChange: (patch: Partial<InvoiceContent>) => void
}

/** Discount, tax, the running total, notes and the PAID stamp. */
export function ExtrasSection({ draft, isPaid, onChange }: ExtrasSectionProps) {
  const totals = computeTotals(draft)
  const currency = draft.currency ? `${draft.currency} ` : ''
  return (
    <SectionCard title="Totals & notes">
      <div className="grid grid-cols-3 gap-3">
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

      <dl className="mt-4 flex flex-col gap-1.5 rounded-xl bg-raised p-4 text-sm">
        <div className="flex justify-between text-muted">
          <dt>Subtotal</dt>
          <dd className="m-0 tabular">{formatSen(totals.subtotalSen)}</dd>
        </div>
        {totals.discountSen > 0 ? (
          <div className="flex justify-between text-muted">
            <dt>Discount</dt>
            <dd className="m-0 tabular">-{formatSen(totals.discountSen)}</dd>
          </div>
        ) : null}
        {totals.taxSen > 0 ? (
          <div className="flex justify-between text-muted">
            <dt>{draft.taxLabel || 'Tax'}</dt>
            <dd className="m-0 tabular">{formatSen(totals.taxSen)}</dd>
          </div>
        ) : null}
        <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd className="m-0 tabular" aria-live="polite">
            {currency}
            {formatSen(totals.totalSen)}
          </dd>
        </div>
      </dl>

      <TextAreaField
        wrapperClassName="mt-4"
        label="Notes"
        hint="Shown under the totals — e.g. station name, vendor code, payment terms."
        value={draft.notes}
        maxLength={2000}
        rows={5}
        onChange={(e) => onChange({ notes: e.target.value })}
      />

      {isPaid ? (
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={draft.showPaidStamp}
            onChange={(e) => onChange({ showPaidStamp: e.target.checked })}
            className="size-5 accent-ink"
          />
          Show a “PAID” stamp on the document
        </label>
      ) : null}
    </SectionCard>
  )
}
