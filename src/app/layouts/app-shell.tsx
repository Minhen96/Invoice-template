import { api } from '@convex/_generated/api'
import { useAuthActions } from '@convex-dev/auth/react'
import { Link, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { FileText, LogOut, Plus, Settings, Users } from 'lucide-react'

import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Menu } from '@/components/ui/menu'
import { useCreateInvoice } from '@/hooks/use-create-invoice'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/', label: 'Invoices', Icon: FileText, exact: true },
  { to: '/clients', label: 'Clients', Icon: Users, exact: false },
  { to: '/settings', label: 'Settings', Icon: Settings, exact: false },
] as const

/** Signed-in layout: top bar on wide screens, bottom tabs on phones (easy thumb reach). */
export function AppShell() {
  const { createInvoice, creating } = useCreateInvoice()

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
                activeOptions={{ exact }}
                className="flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-sunken hover:text-text data-[status=active]:bg-sunken data-[status=active]:text-text"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              loading={creating}
              onClick={() => void createInvoice()}
              className="max-sm:size-11 max-sm:px-0"
            >
              {creating ? null : <Plus />}
              <span className="max-sm:sr-only">New invoice</span>
            </Button>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8 sm:pb-16">
        <Outlet />
      </main>

      <nav
        aria-label="Main (tabs)"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {NAV.map(({ to, label, Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className={cn(
              'flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-medium text-muted',
              'data-[status=active]:text-text',
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function AccountMenu() {
  const viewer = useQuery(api.account.viewer)
  const { signOut } = useAuthActions()
  const label = [viewer?.name, viewer?.email].find((value) => value !== undefined && value !== '')
  const initial = (label ?? '?').charAt(0).toUpperCase()

  return (
    <Menu
      trigger={
        <button
          type="button"
          aria-label="Account"
          className="flex size-11 items-center justify-center rounded-full sm:size-9"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-onink">
            {initial}
          </span>
        </button>
      }
      items={[
        { label: viewer?.email ?? 'Account', onSelect: () => undefined, disabled: true },
        'separator',
        { label: 'Log out', icon: <LogOut />, onSelect: () => void signOut() },
      ]}
    />
  )
}
