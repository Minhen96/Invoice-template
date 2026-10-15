import { addDays, daysBetween, DATE_FORMATS, formatDate, isIsoDate } from '@convex/lib/dates'
import type { InvoiceContent } from '@convex/lib/validators'

import { SectionCard } from '@/components/ui/card'
import { Field, SelectField } from '@/components/ui/field'
import { cn } from '@/lib/cn'

const TERMS = [
  { label: 'None', days: null },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
] as const

interface DetailsSectionProps {
  draft: InvoiceContent
  numberError?: string | undefined
  onChange: (patch: Partial<InvoiceContent>) => void
}

export function DetailsSection({ draft, numberError, onChange }: DetailsSectionProps) {
  const termDays =
    draft.dueDate && isIsoDate(draft.issueDate) ? daysBetween(draft.issueDate, draft.dueDate) : null

  return (
    <SectionCard title="Details">
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Title"
          list="document-titles"
          value={draft.title}
          maxLength={60}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <datalist id="document-titles">
          <option value="INVOICE" />
          <option value="QUOTATION" />
          <option value="RECEIPT" />
          <option value="TAX INVOICE" />
        </datalist>
        <Field
          label="Number"
          value={draft.number}
          maxLength={50}
          error={numberError}
          onChange={(e) => onChange({ number: e.target.value })}
        />
        <Field
          label="Date"
          type="date"
          value={draft.issueDate}
          onChange={(e) => {
            const issueDate = e.target.value
            if (!isIsoDate(issueDate)) return
            // Keep the same payment terms when the date moves.
            const dueDate = termDays === null ? draft.dueDate : addDays(issueDate, termDays)
            onChange({ issueDate, dueDate })
          }}
        />
        <Field
          label="Due date"
          type="date"
          value={draft.dueDate}
          min={draft.issueDate}
          onChange={(e) => onChange({ dueDate: e.target.value })}
        />
      </div>
      <div role="group" aria-label="Payment terms" className="mt-3 flex flex-wrap gap-1.5">
        {TERMS.map((term) => {
          const active = term.days === null ? draft.dueDate === '' : termDays === term.days
          return (
            <button
              key={term.label}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange({
                  dueDate: term.days === null ? '' : addDays(draft.issueDate, term.days),
                })
              }
              className={cn(
                'h-11 rounded-full border border-line px-3.5 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-text sm:h-8',
                active && 'border-ink bg-ink text-onink hover:border-ink hover:text-onink',
              )}
            >
              {term.label}
            </button>
          )
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Field
          label="Currency"
          value={draft.currency}
          maxLength={10}
          onChange={(e) => onChange({ currency: e.target.value })}
        />
        <SelectField
          label="Date style"
          value={draft.dateFormat}
          onChange={(e) => onChange({ dateFormat: e.target.value as InvoiceContent['dateFormat'] })}
        >
          {DATE_FORMATS.map((format) => (
            <option key={format} value={format}>
              {formatDate(draft.issueDate, format) || format}
            </option>
          ))}
        </SelectField>
      </div>
    </SectionCard>
  )
}
