import { createFileRoute } from '@tanstack/react-router'

import { PageError } from '@/components/shared/page-error'
import { EditorPage } from '@/features/editor'

export const Route = createFileRoute('/_app/invoices/$id')({
  component: EditorRoute,
  errorComponent: () => <PageError what="this invoice" />,
})

function EditorRoute() {
  const { id } = Route.useParams()
  return <EditorPage id={id} />
}
