import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AuthLayout } from '@/features/auth'
import { safeRedirect } from '@/lib/safe-redirect'

/** Log in, sign up and forgot password: only for signed-out visitors. */
export const Route = createFileRoute('/_guest')({
  beforeLoad: ({ context, location }) => {
    if (context.auth.isAuthenticated) {
      const search = location.search as { redirect?: unknown }
      throw redirect({ href: safeRedirect(search.redirect) })
    }
  },
  component: () => (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  ),
})
