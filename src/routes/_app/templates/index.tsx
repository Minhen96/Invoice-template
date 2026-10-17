import { createFileRoute } from '@tanstack/react-router'

import { PageError } from '@/components/shared/page-error'
import { TemplatesPage } from '@/features/templates'

export const Route = createFileRoute('/_app/templates/')({
  component: TemplatesPage,
  errorComponent: () => <PageError what="templates" />,
})
