import type { ReactNode } from 'react'

import { Logo } from '@/components/shared/logo'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-10 sm:justify-center sm:py-16">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-[400px] rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        {children}
      </div>
      <p className="mt-6 max-w-[400px] text-center text-[13px] text-muted">
        Make clean invoices in minutes and always know what&apos;s been paid.
      </p>
    </main>
  )
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="m-0 text-xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="m-0 mt-1.5 text-sm text-muted">{subtitle}</p> : null}
    </div>
  )
}
