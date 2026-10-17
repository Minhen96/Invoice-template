import { api } from '@convex/_generated/api'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import { useId } from 'react'

import { inputClass } from '@/components/ui/field'
import { cn } from '@/lib/cn'

type TemplateRow = Doc<'templates'> & { logoUrl: string | null }

interface TemplateSwitcherProps {
  templateId: Id<'templates'> | undefined
  /** Restyle the draft with this template (saved with the rest of the edit). */
  onSwitch: (template: TemplateRow) => void
}

/** Which template this invoice uses; switching restyles it (look, columns, terms). */
export function TemplateSwitcher({ templateId, onSwitch }: TemplateSwitcherProps) {
  const templates = useQuery(api.templates.list)
  const selectId = useId()
  const current = templates?.find((t) => t._id === templateId)

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <label htmlFor={selectId} className="text-[13px] font-medium text-muted">
        Template
      </label>
      <select
        id={selectId}
        value={current?._id ?? ''}
        disabled={templates === undefined}
        onChange={(e) => {
          const next = templates?.find((t) => t._id === e.target.value)
          if (next) onSwitch(next)
        }}
        className={cn(inputClass, 'h-11 w-auto min-w-48 pr-8 sm:h-9 sm:text-sm')}
      >
        {current === undefined ? <option value="">Template deleted</option> : null}
        {(templates ?? []).map((t) => (
          <option key={t._id} value={t._id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
