import { createFileRoute } from '@tanstack/react-router'

import { PrivacyPage } from '@/features/legal'

// Public: Google's sign-in setup links here, and it's readable without an account.
export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})
