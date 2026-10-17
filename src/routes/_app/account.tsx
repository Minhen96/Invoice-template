import { createFileRoute } from '@tanstack/react-router'

import { PageError } from '@/components/shared/page-error'
import { AccountPage } from '@/features/account'

export const Route = createFileRoute('/_app/account')({
  component: AccountPage,
  errorComponent: () => <PageError what="your account" />,
})
