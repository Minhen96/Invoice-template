import { DATE_FORMATS, formatDate, type DateFormat } from '@convex/lib/dates'
import { Field, SelectField } from '@/components/ui/field'

interface DocumentSettings {
  title: string
  currency: string
  dateFormat: DateFormat
}

/** Title (INVOICE / QUOTATION / RECEIPT…), currency and how dates are written. */
export function DocumentSettingsFields({
  value,
  sampleDate,
  onChange,
}: {
  value: DocumentSettings
  /** Shown in the date style options. */
  sampleDate: string
  onChange: (patch: Partial<DocumentSettings>) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field
        label="Title"
        list="document-titles"
        value={value.title}
        maxLength={60}
        wrapperClassName="col-span-2"
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <datalist id="document-titles">
        <option value="INVOICE" />
        <option value="QUOTATION" />
        <option value="RECEIPT" />
        <option value="TAX INVOICE" />
      </datalist>
      <Field
        label="Currency"
        value={value.currency}
        maxLength={10}
        onChange={(e) => onChange({ currency: e.target.value })}
      />
      <SelectField
        label="Date style"
        value={value.dateFormat}
        onChange={(e) => onChange({ dateFormat: e.target.value as DateFormat })}
      >
        {DATE_FORMATS.map((format) => (
          <option key={format} value={format}>
            {formatDate(sampleDate, format) || format}
          </option>
        ))}
      </SelectField>
    </div>
  )
}
