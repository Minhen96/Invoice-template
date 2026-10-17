import type { Id } from '@convex/_generated/dataModel'
import { createContext, useContext } from 'react'

export interface NewInvoiceOptions {
  /** Pre-pick this template / client instead of the last-used ones. */
  templateId?: Id<'templates'>
  clientId?: Id<'clients'>
}

export const NewInvoiceContext = createContext<((options?: NewInvoiceOptions) => void) | null>(null)

/** Opens the "New invoice" popup (provided by NewInvoiceProvider in the app shell). */
export function useNewInvoice(): (options?: NewInvoiceOptions) => void {
  const open = useContext(NewInvoiceContext)
  if (!open) throw new Error('useNewInvoice must be used inside <NewInvoiceProvider>')
  return open
}
