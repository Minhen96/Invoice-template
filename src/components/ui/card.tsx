import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface shadow-card', className)}
      {...props}
    />
  )
}

interface SectionCardProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Just the contents (and action), no card or title — for reusing a section inside a popup. */
  bare?: boolean
}

/** A titled card, used for form sections (Settings, editor). */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bare = false,
}: SectionCardProps) {
  if (bare) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        {action ? <div className="flex justify-end">{action}</div> : null}
        <div>{children}</div>
      </div>
    )
  }
  return (
    <Card className={cn('p-5 sm:p-6', className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
          {description ? <p className="m-0 mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}
