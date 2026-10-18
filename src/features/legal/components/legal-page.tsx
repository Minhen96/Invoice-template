import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { LegalLinks } from '@/components/shared/legal-links'
import { Logo } from '@/components/shared/logo'

export const CONTACT_EMAIL = 'hello@dreavelab.com'
export const OPERATOR = 'DreaveLab'
/** When the current texts took effect. Update it whenever either page changes. */
export const EFFECTIVE_DATE = '18 October 2026'

/** A plain reading page (privacy policy, terms), open to everyone, signed in or not. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh px-4 py-10 sm:py-14">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <Link to="/" aria-label="Invoices home" className="self-start rounded-lg">
          <Logo />
        </Link>
        <main className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-10">
          <article className="flex flex-col gap-6 text-[15px] leading-relaxed">
            <header>
              <h1 className="m-0 text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="m-0 mt-1.5 text-sm text-muted">Effective {EFFECTIVE_DATE}</p>
            </header>
            {children}
          </article>
        </main>
        <LegalLinks className="justify-center" />
      </div>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <p className="m-0 text-text">{children}</p>
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">{children}</ul>
}

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
  )
}
