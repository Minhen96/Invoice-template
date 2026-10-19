import { createFileRoute } from '@tanstack/react-router'

import { PageError } from '@/components/shared/page-error'
import { NewTemplatePage } from '@/features/templates'

export const Route = createFileRoute('/_app/templates/new')({
  component: NewTemplatePage,
  errorComponent: () => <PageError what="this template" />,
})
