import { createFileRoute } from '@tanstack/react-router'

import { PageError } from '@/components/shared/page-error'
import { ClientsPage } from '@/features/clients'

export const Route = createFileRoute('/_app/clients')({
  component: ClientsPage,
  errorComponent: () => <PageError what="clients" />,
})
