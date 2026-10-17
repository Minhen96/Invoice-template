import { AlertCircle, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface SettingsRowProps {
  title: string
  /** One line: what's set now, or what's missing. */
  summary: string
  /** Shows an "Incomplete" tag (with an icon, not colour alone). */
  incomplete?: boolean
  /** Shows a "Default" tag. */
  isDefault?: boolean
  /** Click opens the section's popup. Omit when the row has its own `action` instead. */
  onOpen?: () => void
  action?: ReactNode
}

/** One section of the Account page, kept to a single line until opened. */
export function SettingsRow({
  title,
  summary,
  incomplete = false,
  isDefault = false,
  onOpen,
  action,
}: SettingsRowProps) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
          {title}
          {isDefault ? (
            <span className="inline-flex h-6 items-center rounded-full bg-sunken px-2 text-[12.5px] font-medium text-muted">
              Default
            </span>
          ) : null}
          {incomplete ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-unpaid-bg px-2 text-[12.5px] font-medium text-unpaid">
              <AlertCircle aria-hidden="true" className="size-3.5" />
              Incomplete
            </span>
          ) : null}
        </span>
        <span className="truncate text-[13px] text-muted">{summary}</span>
      </span>
      {onOpen ? <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" /> : null}
    </>
  )

  const rowClass =
    'flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left sm:px-6 border-t border-line first:border-t-0'

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(rowClass, 'transition-colors hover:bg-raised focus-visible:bg-raised')}
      >
        {body}
      </button>
    )
  }
  return (
    <div className={rowClass}>
      {body}
      {action}
    </div>
  )
}
