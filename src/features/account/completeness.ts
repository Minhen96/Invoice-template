import type { Business, Payment } from '@convex/lib/validators'

/**
 * What still needs filling in before invoices look complete. Only what the invoice really
 * needs: who you are and how to pay you. Everything else is optional.
 */
export function missingBusiness(business: Business): string[] {
  const missing: string[] = []
  if (business.name.trim() === '') missing.push('business name')
  if (business.address.trim() === '') missing.push('address')
  return missing
}

export function missingPayment(payment: Payment): string[] {
  const missing: string[] = []
  if (payment.accountName.trim() === '') missing.push('account name')
  if (payment.bankName.trim() === '') missing.push('bank')
  if (payment.accountNumber.trim() === '') missing.push('account number')
  return missing
}

/** "Add business name and address." */
export function missingSentence(missing: readonly string[]): string {
  if (missing.length === 0) return ''
  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1] ?? ''}`
  return `Add ${list ?? ''}.`
}
