import type { Business, Payment } from '@convex/lib/validators'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { BusinessFields, PaymentFields } from '@/components/shared/party-fields'
import { Card } from '@/components/ui/card'

const PER_INVOICE_NOTE =
  'Changes here apply to this invoice only. Edit your usual details in Settings.'

/** Collapsed by default: these come from Settings and rarely change per invoice. */
function Collapsible({
  title,
  summary,
  children,
}: {
  title: string
  summary: string
  children: ReactNode
}) {
  return (
    <Card>
      <details className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold">{title}</span>
            <span className="truncate text-[13px] text-muted">{summary || 'Not filled in'}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-4 px-5 pb-6 sm:px-6">
          {children}
          <p className="m-0 text-[12.5px] text-muted">{PER_INVOICE_NOTE}</p>
        </div>
      </details>
    </Card>
  )
}

export function FromSection({
  from,
  onChange,
}: {
  from: Business
  onChange: (from: Business) => void
}) {
  return (
    <Collapsible title="From (your business)" summary={from.name}>
      <BusinessFields value={from} onChange={onChange} />
    </Collapsible>
  )
}

export function PaymentSection({
  payment,
  onChange,
}: {
  payment: Payment
  onChange: (payment: Payment) => void
}) {
  return (
    <Collapsible
      title="Payment details"
      summary={[payment.bankName, payment.accountNumber].filter(Boolean).join(' · ')}
    >
      <PaymentFields value={payment} onChange={onChange} />
    </Collapsible>
  )
}
