import type { Business, Payment } from '@convex/lib/validators'

import { Field, TextAreaField } from '@/components/ui/field'

/** Your business details — the same fields in Settings and in each invoice. */
export function BusinessFields({
  value,
  onChange,
}: {
  value: Business
  onChange: (value: Business) => void
}) {
  const set = (key: keyof Business, text: string) => {
    onChange({ ...value, [key]: text })
  }
  return (
    <>
      <Field
        label="Business name"
        placeholder="e.g. LIM KAI XIN TRADING AS LIM KAI XIN"
        value={value.name}
        maxLength={200}
        onChange={(e) => set('name', e.target.value)}
      />
      <Field
        label="Registration no. (optional)"
        placeholder="e.g. 202303080716 (KT0543198-W)"
        value={value.regNo}
        maxLength={200}
        onChange={(e) => set('regNo', e.target.value)}
      />
      <TextAreaField
        label="Address"
        value={value.address}
        rows={3}
        maxLength={2000}
        onChange={(e) => set('address', e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Email (optional)"
          type="email"
          value={value.email}
          maxLength={200}
          onChange={(e) => set('email', e.target.value)}
        />
        <Field
          label="Phone (optional)"
          type="tel"
          value={value.phone}
          maxLength={200}
          onChange={(e) => set('phone', e.target.value)}
        />
      </div>
    </>
  )
}

/** Where clients pay you. */
export function PaymentFields({
  value,
  onChange,
}: {
  value: Payment
  onChange: (value: Payment) => void
}) {
  const set = (key: keyof Payment, text: string) => {
    onChange({ ...value, [key]: text })
  }
  return (
    <>
      <Field
        label="Account name"
        value={value.accountName}
        maxLength={200}
        onChange={(e) => set('accountName', e.target.value)}
      />
      <div className="grid grid-cols-[0.7fr_1fr] gap-4">
        <Field
          label="ID label"
          placeholder="IC No"
          value={value.idLabel}
          maxLength={200}
          onChange={(e) => set('idLabel', e.target.value)}
        />
        <Field
          label="ID number (optional)"
          value={value.idNumber}
          maxLength={200}
          onChange={(e) => set('idNumber', e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Bank"
          placeholder="e.g. Public Bank"
          value={value.bankName}
          maxLength={200}
          onChange={(e) => set('bankName', e.target.value)}
        />
        <Field
          label="Account no."
          inputMode="numeric"
          value={value.accountNumber}
          maxLength={200}
          onChange={(e) => set('accountNumber', e.target.value)}
        />
      </div>
      <TextAreaField
        label="Other (optional)"
        hint="e.g. DuitNow ID, SWIFT code. One per line."
        value={value.extra}
        rows={2}
        maxLength={2000}
        onChange={(e) => set('extra', e.target.value)}
      />
    </>
  )
}
