import { Check, Clock } from 'lucide-react'

import { cn } from '@/lib/cn'

type Status = 'paid' | 'unpaid'

const STYLES: Record<Status, { label: string; className: string; Icon: typeof Check }> = {
  paid: { label: 'Paid', className: 'bg-paid-bg text-paid', Icon: Check },
  unpaid: { label: 'Unpaid', className: 'bg-unpaid-bg text-unpaid', Icon: Clock },
}

/** Payment status. Colour is never the only signal: each state has its own icon and word. */
export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const { label, className: tone, Icon } = STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12.5px] font-medium',
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  )
}
