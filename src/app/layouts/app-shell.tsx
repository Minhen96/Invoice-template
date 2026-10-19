import { api } from '@convex/_generated/api'
import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ArrowRight, FileText, LayoutTemplate, Package, Plus, Users, X } from 'lucide-react'
import { useState } from 'react'

import { Logo } from '@/components/shared/logo'
import { NewInvoiceProvider } from '@/components/shared/new-invoice-dialog'
import { SiteFooter } from '@/components/shared/site-footer'
import { Button } from '@/components/ui/button'
import { useNewInvoice } from '@/hooks/new-invoice-context'
import { cn } from '@/lib/cn'
import { needsBusiness } from '@/lib/parties'

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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
        <Outlet />
      </main>

      {/* On phones the bottom tabs cover the last 4rem, so the footer sits above them. */}
      <div className="border-t border-line pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
        <SiteFooter className="mx-auto max-w-6xl px-4 py-2 sm:justify-between sm:px-6" />
      </div>

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

/**
 * Your initial; opens the Account page (business details, sign-in, log out).
 * Until your business details are in, a tip points at it — the first thing to set up.
 */
function AccountLink() {
  const viewer = useQuery(api.account.viewer)
  const businesses = useQuery(api.businesses.list)
  const pathname = useLocation({ select: (location) => location.pathname })
  const [dismissed, setDismissed] = useState(false)
  const label = [viewer?.name, viewer?.email].find((value) => value !== undefined && value !== '')
  const initial = (label ?? '?').charAt(0).toUpperCase()
  const setupBusiness = needsBusiness(businesses) === true
  const showTip = setupBusiness && !dismissed && pathname !== '/account'

  return (
    <div className="relative">
      <Link
        to="/account"
        aria-label="Account"
        className="group relative flex size-11 items-center justify-center rounded-full sm:size-9"
      >
        {setupBusiness ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 m-auto size-9 animate-ping rounded-full bg-ink/25"
          />
        ) : null}
        <span className="relative flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-onink ring-offset-2 ring-offset-bg group-data-[status=active]:ring-2 group-data-[status=active]:ring-ink">
          {initial}
        </span>
      </Link>
      {showTip ? <AccountTip onDismiss={() => setDismissed(true)} /> : null}
    </div>
  )
}

/** A callout under the avatar, its arrow pointing up at it. */
function AccountTip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      aria-labelledby="account-tip-title"
      role="group"
      className="absolute top-full right-0 mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-card bg-ink p-4 text-onink shadow-pop"
    >
      {/* The arrow, centred under the avatar (44px box on phones, 36px from sm). */}
      <span
        aria-hidden="true"
        className="absolute -top-1.5 right-4 size-3 rotate-45 rounded-[2px] bg-ink sm:right-3"
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[12.5px] font-medium text-onink/75">Start here</p>
          <p id="account-tip-title" className="m-0 mt-0.5 font-semibold">
            Add your business details
          </p>
        </div>
        <button
          type="button"
          aria-label="Hide tip"
          onClick={onDismiss}
          className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-onink/75 hover:bg-onink/15 hover:text-onink sm:size-9"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <p className="m-0 mt-1 text-sm text-onink/85">
        Your account holds your business and bank details. They go on every invoice — fill them in
        once.
      </p>
      <Link
        to="/account"
        className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-onink px-4 text-sm font-medium text-ink hover:bg-onink/90 sm:h-9"
      >
        Set up account <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  )
}
