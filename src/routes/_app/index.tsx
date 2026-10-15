import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PageError } from '@/components/shared/page-error'
import { InvoicesPage, STATUS_FILTERS } from '@/features/invoices'

const search = z.object({
  status: z.enum(STATUS_FILTERS).catch('all').default('all'),
  q: z.string().catch('').default(''),
})

export const Route = createFileRoute('/_app/')({
  validateSearch: search,
  component: InvoicesRoute,
  errorComponent: () => <PageError what="invoices" />,
})

function InvoicesRoute() {
  const { status, q } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <InvoicesPage
      status={status}
      q={q}
      onSearchChange={(next) =>
        void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
      }
    />
  )
}
