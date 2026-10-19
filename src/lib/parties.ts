import { EMPTY_BUSINESS, EMPTY_PAYMENT } from '@convex/lib/defaults'
import type { Business, Payment } from '@convex/lib/validators'

interface Row {
  _id: string
  isDefault: boolean
}

/**
 * Which business / bank account a template uses — the same rule as the server's `resolveOwn`:
 * the chosen one if it still exists, else the default, else the first, else none.
 */
export function pickRow<T extends Row>(rows: readonly T[] | undefined, chosen?: string): T | null {
  if (!rows) return null
  return (
    rows.find((row) => row._id === chosen) ?? rows.find((row) => row.isDefault) ?? rows[0] ?? null
  )
}

/**
 * First-run: your business details aren't in yet (no business, or the one in use has no name).
 * `undefined` while the list is loading, so callers don't flash setup guidance.
 */
export function needsBusiness(rows: readonly (Row & { name: string })[] | undefined) {
  if (rows === undefined) return undefined
  return (pickRow(rows)?.name ?? '') === ''
}

export function asBusiness(row: (Business & Row) | null): Business {
  if (!row) return EMPTY_BUSINESS
  const { name, regNo, address, email, phone } = row
  return { name, regNo, address, email, phone }
}

export function asPayment(row: (Payment & Row) | null): Payment {
  if (!row) return EMPTY_PAYMENT
  const { accountName, idLabel, idNumber, bankName, accountNumber, extra } = row
  return { accountName, idLabel, idNumber, bankName, accountNumber, extra }
}
