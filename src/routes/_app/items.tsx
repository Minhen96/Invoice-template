import { createFileRoute } from '@tanstack/react-router'

import { PageError } from '@/components/shared/page-error'
import { ItemsPage } from '@/features/items'

export const Route = createFileRoute('/_app/items')({
  component: ItemsPage,
  errorComponent: () => <PageError what="items" />,
})
