import { createFileRoute } from '@tanstack/react-router'

import { PageError } from '@/components/shared/page-error'
import { TemplateEditorPage } from '@/features/templates'

export const Route = createFileRoute('/_app/templates/$id')({
  component: TemplateRoute,
  errorComponent: () => <PageError what="this template" />,
})

function TemplateRoute() {
  const { id } = Route.useParams()
  return <TemplateEditorPage id={id} />
}
