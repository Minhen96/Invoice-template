import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { DATE_FORMATS, formatDate } from '@convex/lib/dates'
import { ACCENTS, TEMPLATES } from '@convex/lib/defaults'
import type { Business, Payment, ProfileDefaults } from '@convex/lib/validators'
import { useAction, useMutation } from 'convex/react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { BusinessFields, PaymentFields } from '@/components/shared/party-fields'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Field, SelectField, TextAreaField } from '@/components/ui/field'
import { errorMessage } from '@/lib/errors'
import { today } from '@/lib/today'

interface ProfilePatch {
  business?: Business
  payment?: Payment
  defaults?: ProfileDefaults
  nextNumber?: string
}

function useSaveProfile() {
  const update = useMutation(api.profiles.update)
  return async (patch: ProfilePatch, success: string) => {
    try {
      await update({ today: today(), ...patch })
      toast.success(success)
      return true
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save. Please try again."))
      return false
    }
  }
}

/** Local copy of a saved value with a Save button that appears once it's edited. */
function useEditable<T>(saved: T) {
  const [value, setValue] = useState(saved)
  const [base, setBase] = useState(saved)
  // A newer saved value (e.g. from another device) replaces untouched local edits.
  if (saved !== base && JSON.stringify(saved) !== JSON.stringify(base)) {
    setBase(saved)
    if (JSON.stringify(value) === JSON.stringify(base)) setValue(saved)
  }
  const dirty = JSON.stringify(value) !== JSON.stringify(base)
  return { value, setValue, dirty, reset: () => setValue(base) }
}

function SaveBar({
  dirty,
  saving,
  onSave,
  onReset,
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
  onReset: () => void
}) {
  if (!dirty) return null
  return (
    <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
      <Button variant="ghost" size="sm" onClick={onReset}>
        Cancel
      </Button>
      <Button size="sm" loading={saving} onClick={onSave}>
        Save changes
      </Button>
    </div>
  )
}

function EditableCard<T>({
  title,
  description,
  saved,
  successMessage,
  toPatch,
  children,
}: {
  title: string
  description: string
  saved: T
  successMessage: string
  toPatch: (value: T) => ProfilePatch
  children: (value: T, setValue: (value: T) => void) => ReactNode
}) {
  const { value, setValue, dirty, reset } = useEditable(saved)
  const save = useSaveProfile()
  const [saving, setSaving] = useState(false)
  return (
    <SectionCard title={title} description={description}>
      <div className="flex flex-col gap-4">{children(value, setValue)}</div>
      <SaveBar
        dirty={dirty}
        saving={saving}
        onReset={reset}
        onSave={() => {
          setSaving(true)
          void save(toPatch(value), successMessage).finally(() => setSaving(false))
        }}
      />
    </SectionCard>
  )
}

export function BusinessCard({ business }: { business: Business }) {
  return (
    <EditableCard
      title="Your business"
      description="Shown as “From” on new invoices."
      saved={business}
      successMessage="Business details saved"
      toPatch={(value) => ({ business: value })}
    >
      {(value, setValue) => <BusinessFields value={value} onChange={setValue} />}
    </EditableCard>
  )
}

export function PaymentCard({ payment }: { payment: Payment }) {
  return (
    <EditableCard
      title="Payment details"
      description="Where clients pay you. Shown on new invoices."
      saved={payment}
      successMessage="Payment details saved"
      toPatch={(value) => ({ payment: value })}
    >
      {(value, setValue) => <PaymentFields value={value} onChange={setValue} />}
    </EditableCard>
  )
}

interface DefaultsValue {
  defaults: ProfileDefaults
  nextNumber: string
}

export function DefaultsCard({ defaults, nextNumber }: DefaultsValue) {
  return (
    <EditableCard
      title="New invoice defaults"
      description="Used when you create an invoice. Existing invoices don't change."
      saved={{ defaults, nextNumber }}
      successMessage="Defaults saved"
      toPatch={(value) => value}
    >
      {(value, setValue) => {
        const set = (patch: Partial<ProfileDefaults>) =>
          setValue({ ...value, defaults: { ...value.defaults, ...patch } })
        const d = value.defaults
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Next invoice number"
                hint="Counts up by itself."
                value={value.nextNumber}
                maxLength={50}
                onChange={(e) => setValue({ ...value, nextNumber: e.target.value })}
              />
              <Field
                label="Title"
                value={d.title}
                maxLength={60}
                onChange={(e) => set({ title: e.target.value })}
              />
              <SelectField
                label="Template"
                value={d.template}
                onChange={(e) => set({ template: e.target.value as ProfileDefaults['template'] })}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Accent colour"
                value={ACCENTS.some((a) => a.value === d.accent) ? d.accent : ''}
                onChange={(e) => {
                  if (e.target.value) set({ accent: e.target.value })
                }}
              >
                {ACCENTS.some((a) => a.value === d.accent) ? null : (
                  <option value="">Custom</option>
                )}
                {ACCENTS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.name}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Currency"
                value={d.currency}
                maxLength={10}
                onChange={(e) => set({ currency: e.target.value })}
              />
              <SelectField
                label="Date style"
                value={d.dateFormat}
                onChange={(e) =>
                  set({ dateFormat: e.target.value as ProfileDefaults['dateFormat'] })
                }
              >
                {DATE_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {formatDate(today(), format)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Payment due"
                value={d.dueDays === null ? 'none' : String(d.dueDays)}
                onChange={(e) =>
                  set({ dueDays: e.target.value === 'none' ? null : Number(e.target.value) })
                }
              >
                <option value="none">No due date</option>
                <option value="0">On receipt</option>
                {[7, 14, 30, 45, 60].map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </SelectField>
            </div>
            <TextAreaField
              label="Default notes"
              hint="Added to new invoices (a saved client's own notes take priority)."
              rows={3}
              maxLength={2000}
              value={d.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 text-[13px] font-medium text-muted">Column names</legend>
              <div className="grid grid-cols-2 gap-3">
                {(['description', 'rate', 'quantity', 'amount'] as const).map((key) => (
                  <Field
                    key={key}
                    label={`${{ description: 'Description', rate: 'Rate', quantity: 'Quantity', amount: 'Total' }[key]} column heading`}
                    value={d.labels[key]}
                    maxLength={60}
                    onChange={(e) => set({ labels: { ...d.labels, [key]: e.target.value } })}
                  />
                ))}
              </div>
            </fieldset>
          </>
        )
      }}
    </EditableCard>
  )
}

const MAX_LOGO_BYTES = 1024 * 1024

export function LogoCard({ logoUrl }: { logoUrl: string | null }) {
  const generateUploadUrl = useMutation(api.profiles.generateLogoUploadUrl)
  const setLogo = useAction(api.profiles.setLogo)
  const removeLogo = useMutation(api.profiles.removeLogo)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Please use an image under 1 MB.')
      return
    }
    setBusy(true)
    try {
      const url = await generateUploadUrl()
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('upload failed')
      const { storageId } = (await response.json()) as { storageId: string }
      await setLogo({ storageId: storageId as Id<'_storage'>, today: today() })
      toast.success('Logo updated')
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't use that image. Try a PNG or JPG under 1 MB."))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <SectionCard title="Logo" description="Optional. Shown at the top of every invoice.">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-32 items-center justify-center rounded-xl border border-dashed border-line-strong bg-raised p-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Your logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImagePlus aria-hidden="true" className="size-6 text-muted" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            id="logo-file"
            aria-label="Logo image file"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void upload(file)
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={busy}
            onClick={() => input.current?.click()}
          >
            {logoUrl ? 'Change logo' : 'Upload logo'}
          </Button>
          {logoUrl ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                void removeLogo().then(() => toast.success('Logo removed'))
              }}
            >
              <Trash2 /> Remove
            </Button>
          ) : (
            <span className="text-[12.5px] text-muted">PNG, JPG or WebP, up to 1 MB.</span>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
