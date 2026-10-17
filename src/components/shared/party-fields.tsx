import type { Business, Payment } from '@convex/lib/validators'
import { useState } from 'react'

import { Field, SelectField, TextAreaField } from '@/components/ui/field'

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
      <IdNumberFields
        idLabel={value.idLabel}
        idNumber={value.idNumber}
        onChange={(patch) => onChange({ ...value, ...patch })}
      />
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

/** Common ID types, printed before the number (e.g. "IC No: 000928-03-0320"). */
const ID_TYPES = ['IC No', 'Passport No', 'SSM No', 'Company No'] as const
const OTHER = 'other'

/**
 * An optional ID shown in the payment details. The type is a short pick-list; "Other…" lets you
 * type your own wording.
 */
function IdNumberFields({
  idLabel,
  idNumber,
  onChange,
}: {
  idLabel: string
  idNumber: string
  onChange: (patch: { idLabel?: string; idNumber?: string }) => void
}) {
  const known = (ID_TYPES as readonly string[]).includes(idLabel)
  const [custom, setCustom] = useState(!known && idLabel !== '')
  const selectValue = custom ? OTHER : known ? idLabel : 'IC No'

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[0.8fr_1fr] gap-4">
        <SelectField
          label="ID type"
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === OTHER) {
              setCustom(true)
              onChange({ idLabel: '' })
            } else {
              setCustom(false)
              onChange({ idLabel: e.target.value })
            }
          }}
        >
          {ID_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
          <option value={OTHER}>Other…</option>
        </SelectField>
        <Field
          label="ID number (optional)"
          hint={`Printed as “${idLabel || 'ID'}: …”`}
          value={idNumber}
          maxLength={200}
          onChange={(e) => onChange({ idNumber: e.target.value })}
        />
      </div>
      {custom ? (
        <Field
          label="ID type name"
          placeholder="e.g. Tax No"
          value={idLabel}
          maxLength={60}
          onChange={(e) => onChange({ idLabel: e.target.value })}
        />
      ) : null}
    </div>
  )
}
