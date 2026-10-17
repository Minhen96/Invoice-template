import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from './card'

interface CollapsibleCardProps {
  title: string
  /** One line shown under the title while closed (what's inside, at a glance). */
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}

/** A card that starts closed: for things people rarely change. Native <details>, so it's accessible. */
export function CollapsibleCard({
  title,
  summary,
  defaultOpen = false,
  children,
}: CollapsibleCardProps) {
  return (
    <Card>
      <details className="group" open={defaultOpen}>
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold">{title}</span>
            {summary !== undefined ? (
              <span className="truncate text-[13px] text-muted">{summary || 'Not filled in'}</span>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-4 px-5 pb-6 sm:px-6">{children}</div>
      </details>
    </Card>
  )
}
