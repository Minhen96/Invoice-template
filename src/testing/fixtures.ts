import type { Doc, Id } from '@convex/_generated/dataModel'
import { DEFAULT_COLUMNS, DEFAULT_TEMPLATE } from '@convex/lib/defaults'

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

export function invoiceDoc(
  partial: Partial<Doc<'invoices'> & { logoUrl: string | null }> = {},
): Doc<'invoices'> & { logoUrl: string | null } {
  return {
    _id: 'inv1' as Id<'invoices'>,
    _creationTime: 0,
    userId: 'user1' as Id<'users'>,
    number: '2026031',
    title: 'INVOICE',
    layout: 'blush',
    templateId: 'tpl1' as Id<'templates'>,
    logoId: undefined,
    logoUrl: null,
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
    columns: {
      ...DEFAULT_COLUMNS,
      rate: 'Rate Per Session / Hour*',
      quantity: 'Quantity (session)',
    },
    items: [
      {
        id: 'a',
        description: 'FULL TIME ANNOUNCER OCT 2026\n(20 days)',
        rateSen: 25000,
        quantity: 20,
        extra: {},
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
    nextNumber: '2026032',
    lastTemplateId: 'tpl1',
    lastClientId: null,
    ...partial,
  }
}

export function businessDoc(partial: Partial<Doc<'businesses'>> = {}): Doc<'businesses'> {
  return {
    _id: 'biz1' as Id<'businesses'>,
    _creationTime: 0,
    userId: 'user1' as Id<'users'>,
    ...business,
    isDefault: true,
    ...partial,
  }
}

export function bankDoc(partial: Partial<Doc<'bankAccounts'>> = {}): Doc<'bankAccounts'> {
  return {
    _id: 'bank1' as Id<'bankAccounts'>,
    _creationTime: 0,
    userId: 'user1' as Id<'users'>,
    ...payment,
    isDefault: true,
    ...partial,
  }
}

export function templateDoc(
  partial: Partial<Doc<'templates'> & { logoUrl: string | null }> = {},
): Doc<'templates'> & { logoUrl: string | null } {
  return {
    _id: 'tpl1' as Id<'templates'>,
    _creationTime: 0,
    userId: 'user1' as Id<'users'>,
    ...DEFAULT_TEMPLATE,
    name: 'Astro announcer',
    columns: {
      ...DEFAULT_COLUMNS,
      rate: 'Rate Per Session / Hour*',
      quantity: 'Quantity (session)',
    },
    logoId: undefined,
    logoUrl: null,
    ...partial,
  }
}

export function itemDoc(partial: Partial<Doc<'items'>> = {}): Doc<'items'> {
  return {
    _id: 'item1' as Id<'items'>,
    _creationTime: 0,
    userId: 'user1' as Id<'users'>,
    key: 'full time announcer (20 days)',
    description: 'FULL TIME ANNOUNCER (20 days)',
    rateSen: 25000,
    quantity: 20,
    useCount: 3,
    lastUsedAt: 0,
    ...partial,
  }
}

/** One row of `invoices.list`: the whole invoice (for its preview), name and client name. */
export function listRow(partial: Partial<ReturnType<typeof rowFrom>> = {}) {
  return { ...rowFrom(invoiceDoc(partial)), ...partial }
}

function rowFrom(doc: Doc<'invoices'> & { logoUrl: string | null }) {
  const { userId: _owner, ...row } = doc
  return { ...row, name: doc.name ?? '', clientName: doc.billTo.name }
}
