import { api } from '@convex/_generated/api'
import { Link, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { FileText, LayoutTemplate, Package, Plus, Users } from 'lucide-react'

import { Logo } from '@/components/shared/logo'
import { NewInvoiceProvider } from '@/components/shared/new-invoice-dialog'
import { Button } from '@/components/ui/button'
import { useNewInvoice } from '@/hooks/new-invoice-context'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/', label: 'Invoices', Icon: FileText, exact: true },
  { to: '/templates', label: 'Templates', Icon: LayoutTemplate, exact: false },
  { to: '/clients', label: 'Clients', Icon: Users, exact: false },
  { to: '/items', label: 'Items', Icon: Package, exact: false },
] as const

/** Signed-in layout: top bar on wide screens, bottom tabs on phones (easy thumb reach). */
export function AppShell() {
  return (
    <NewInvoiceProvider>
      <Shell />
    </NewInvoiceProvider>
  )
}

function Shell() {
  const newInvoice = useNewInvoice()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="Invoices home" className="rounded-lg">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
            {NAV.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact, includeSearch: false }}
                className={cn(
                  'relative flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-sunken hover:text-text',
                  // Current page: darker, bold, shaded, with a bar on the header's bottom edge.
                  'data-[status=active]:bg-sunken data-[status=active]:font-semibold data-[status=active]:text-text',
                  "data-[status=active]:after:absolute data-[status=active]:after:inset-x-2 data-[status=active]:after:-bottom-3.5 data-[status=active]:after:h-0.5 data-[status=active]:after:rounded-full data-[status=active]:after:bg-ink data-[status=active]:after:content-['']",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={() => newInvoice()}>
              <Plus />
              <span className="sm:hidden">Create</span>
              <span className="max-sm:hidden">New invoice</span>
            </Button>
            <AccountLink />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8 sm:pb-16">
        <Outlet />
      </main>

      <nav
        aria-label="Main (tabs)"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {NAV.map(({ to, label, Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact, includeSearch: false }}
            className={cn(
              'group flex h-16 flex-col items-center justify-center gap-1 text-[11.5px] font-medium text-muted',
              'data-[status=active]:font-semibold data-[status=active]:text-text',
            )}
          >
            {/* Current tab: the icon sits in a dark pill. */}
            <span className="flex h-7 w-12 items-center justify-center rounded-full transition-colors group-data-[status=active]:bg-ink group-data-[status=active]:text-onink">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

/** Your initial; opens the Account page (business details, sign-in, log out). */
function AccountLink() {
  const viewer = useQuery(api.account.viewer)
  const label = [viewer?.name, viewer?.email].find((value) => value !== undefined && value !== '')
  const initial = (label ?? '?').charAt(0).toUpperCase()

  return (
    <Link
      to="/account"
      aria-label="Account"
      className="group flex size-11 items-center justify-center rounded-full sm:size-9"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-onink ring-offset-2 ring-offset-bg group-data-[status=active]:ring-2 group-data-[status=active]:ring-ink">
        {initial}
      </span>
    </Link>
  )
}
