import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import type { RouterContext } from '@/app/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  notFoundComponent: NotFound,
})

function Root() {
  return (
    <>
      <Outlet />
      <Toaster position="bottom-center" toastOptions={{ className: 'font-sans' }} />
    </>
  )
}

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="m-0 text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="font-medium underline underline-offset-4">
        Go to invoices
      </Link>
    </main>
  )
}
