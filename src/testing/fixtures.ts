import type { Doc, Id } from '@convex/_generated/dataModel'
import { DEFAULT_LABELS, DEFAULT_PROFILE_DEFAULTS } from '@convex/lib/defaults'

/** Test data modelled on the real pink invoice (personal details replaced). */

export const TODAY = '2026-10-15'

export const business = {
  name: 'LIM KAI XIN TRADING AS LIM KAI XIN',
  regNo: '202303080716 (KT0000000-W)',
  address: 'Lot 1, Jalan Contoh\n16100 Kota Bharu, Kelantan',
  email: '',
  phone: '',
}

export const payment = {
  accountName: 'LIM KAI XIN',
  idLabel: 'IC No',
  idNumber: '000000-00-0000',
  bankName: 'Public Bank',
  accountNumber: '1234567890',
  extra: '',
}

export function invoiceDoc(partial: Partial<Doc<'invoices'>> = {}): Doc<'invoices'> {
  return {
    _id: 'inv1' as Id<'invoices'>,
    _creationTime: 0,
    userId: 'user1' as Id<'users'>,
    number: '2026031',
    title: 'INVOICE',
    template: 'blush',
    accent: '#c2185b',
    currency: 'RM',
    dateFormat: 'd/m/yyyy',
    issueDate: '2026-10-07',
    dueDate: '2026-11-06',
    clientId: undefined,
    billTo: {
      name: 'Astro Radio Sdn Bhd',
      address: 'All Asia Broadcast Centre\nTechnology Park Malaysia\n57000 Kuala Lumpur',
      attention: 'Accounts Payable Department',
    },
    labels: { ...DEFAULT_LABELS, rate: 'Rate Per Session / Hour*', quantity: 'Quantity (session)' },
    items: [
      {
        id: 'a',
        description: 'FULL TIME ANNOUNCER OCT 2026\n(20 days)',
        rateSen: 25000,
        quantity: 20,
      },
    ],
    discountSen: 0,
    taxRateBps: 0,
    taxLabel: 'SST',
    notes: '*whichever applicable\nStation name: GOXUAN',
    from: business,
    payment,
    showPaidStamp: false,
    status: 'unpaid',
    paidAt: '',
    paidNote: '',
    totalSen: 500000,
    ...partial,
  }
}

export function profileResult(partial: Record<string, unknown> = {}) {
  return {
    business,
    payment,
    defaults: DEFAULT_PROFILE_DEFAULTS,
    nextNumber: '2026032',
    logoUrl: null,
    ...partial,
  }
}

export function listRow(partial: Partial<ReturnType<typeof rowFrom>> = {}) {
  return { ...rowFrom(invoiceDoc()), ...partial }
}

function rowFrom(doc: Doc<'invoices'>) {
  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    number: doc.number,
    title: doc.title,
    clientId: doc.clientId,
    clientName: doc.billTo.name,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    currency: doc.currency,
    totalSen: doc.totalSen,
    status: doc.status,
    paidAt: doc.paidAt,
  }
}
