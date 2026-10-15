import { createFileRoute } from '@tanstack/react-router'

import { PageError } from '@/components/shared/page-error'
import { SettingsPage } from '@/features/settings'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
  errorComponent: () => <PageError what="settings" />,
})
