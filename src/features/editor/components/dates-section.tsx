import { addDays, daysBetween, isIsoDate } from '@convex/lib/dates'
import type { InvoiceContent } from '@convex/lib/validators'

import { SectionCard } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { cn } from '@/lib/cn'

const TERMS = [
  { label: 'None', days: null },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
] as const

interface DatesSectionProps {
  draft: InvoiceContent
  onChange: (patch: Partial<InvoiceContent>) => void
  bare?: boolean
}

/** Invoice date and when it's due (quick chips for the usual terms). */
export function DatesSection({ draft, onChange, bare = false }: DatesSectionProps) {
  const termDays =
    draft.dueDate && isIsoDate(draft.issueDate) ? daysBetween(draft.issueDate, draft.dueDate) : null

  return (
    <SectionCard title="Dates" bare={bare}>
      <div className="grid grid-cols-2 gap-4">
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
    </SectionCard>
  )
}
