import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { RouterProvider } from '@tanstack/react-router'
import { useConvexAuth, type ConvexReactClient } from 'convex/react'
import { useEffect, useState } from 'react'

import { Spinner } from '@/components/ui/spinner'

import { createAppRouter } from './router'

export function App({ client }: { client: ConvexReactClient }) {
  return (
    <ConvexAuthProvider client={client}>
      <AuthAwareRouter />
    </ConvexAuthProvider>
  )
}

/**
 * Routes are guarded by the session (see routes/_app.tsx and _guest.tsx). The router waits until
 * the session is known, and re-checks its guards whenever you sign in or out.
 */
function AuthAwareRouter() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const [router] = useState(() => createAppRouter())

  useEffect(() => {
    if (!isLoading) void router.invalidate()
  }, [router, isLoading, isAuthenticated])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted" role="status">
        <Spinner />
        <span className="sr-only">Loading</span>
      </div>
    )
  }
  return <RouterProvider router={router} context={{ auth: { isAuthenticated } }} />
}
