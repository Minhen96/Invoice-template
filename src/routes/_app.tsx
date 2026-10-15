import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '@/app/layouts/app-shell'

/** Every signed-in page. Visitors are sent to log in and brought back afterwards. */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AppShell,
})
