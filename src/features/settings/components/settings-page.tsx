import { api } from '@convex/_generated/api'
import { DEFAULT_PROFILE_DEFAULTS, EMPTY_BUSINESS, EMPTY_PAYMENT } from '@convex/lib/defaults'
import { firstInvoiceNumber } from '@convex/lib/numbering'
import { useQuery } from 'convex/react'

import { Skeleton } from '@/components/ui/skeleton'
import { today } from '@/lib/today'

import { AccountCard } from './account-card'
import { DataCard } from './data-card'
import { BusinessCard, DefaultsCard, LogoCard, PaymentCard } from './profile-cards'

export function SettingsPage() {
  const profile = useQuery(api.profiles.get)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="m-0 mt-1 text-sm text-muted">
          Fill these in once — every new invoice starts with them.
        </p>
      </div>

      {profile === undefined ? (
        <div role="status" aria-label="Loading settings" className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <BusinessCard business={profile?.business ?? EMPTY_BUSINESS} />
            <LogoCard logoUrl={profile?.logoUrl ?? null} />
            <PaymentCard payment={profile?.payment ?? EMPTY_PAYMENT} />
          </div>
          <div className="flex flex-col gap-4">
            <DefaultsCard
              defaults={profile?.defaults ?? DEFAULT_PROFILE_DEFAULTS}
              nextNumber={profile?.nextNumber ?? firstInvoiceNumber(today())}
            />
            <AccountCard />
            <DataCard />
          </div>
        </div>
      )}
    </div>
  )
}
