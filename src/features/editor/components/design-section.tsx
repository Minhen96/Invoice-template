import { ACCENTS, TEMPLATES } from '@convex/lib/defaults'
import type { InvoiceContent } from '@convex/lib/validators'
import { Check } from 'lucide-react'

import { InvoiceDocument, PaperPreview, type DocumentInvoice } from '@/components/document'
import { SectionCard } from '@/components/ui/card'
import { cn } from '@/lib/cn'

interface DesignSectionProps {
  draft: InvoiceContent
  document: DocumentInvoice
  logoUrl: string | null
  onChange: (patch: Partial<InvoiceContent>) => void
}

/** Pick a template (live thumbnails of this very invoice) and an accent colour. */
export function DesignSection({ draft, document, logoUrl, onChange }: DesignSectionProps) {
  const isCustom = !ACCENTS.some((a) => a.value.toLowerCase() === draft.accent.toLowerCase())
  return (
    <SectionCard title="Design">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium text-muted">Template</legend>
        <div className="grid grid-cols-4 gap-2.5">
          {TEMPLATES.map((template) => {
            const selected = draft.template === template.id
            return (
              <button
                key={template.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ template: template.id })}
                className="group flex flex-col items-center gap-1.5 rounded-lg text-[12.5px] font-medium"
              >
                <span
                  className={cn(
                    'pointer-events-none block w-full overflow-hidden rounded-md ring-1 ring-line transition-shadow group-hover:ring-line-strong',
                    selected && 'ring-2 ring-ink group-hover:ring-ink',
                  )}
                  aria-hidden="true"
                >
                  <PaperPreview maxScale={0.2}>
                    <InvoiceDocument
                      invoice={{ ...document, template: template.id }}
                      logoUrl={logoUrl}
                    />
                  </PaperPreview>
                </span>
                <span className={cn('text-muted', selected && 'text-text')}>{template.name}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 mt-5 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium text-muted">Accent colour</legend>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENTS.map((accent) => {
            const selected = accent.value.toLowerCase() === draft.accent.toLowerCase()
            return (
              <button
                key={accent.value}
                type="button"
                aria-label={accent.name}
                aria-pressed={selected}
                onClick={() => onChange({ accent: accent.value })}
                className={cn(
                  'flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-surface sm:size-9',
                  selected && 'ring-2 ring-ink',
                )}
              >
                <span
                  className="flex size-7 items-center justify-center rounded-full"
                  style={{ background: accent.value }}
                >
                  {selected ? <Check aria-hidden="true" className="size-4 text-onink" /> : null}
                </span>
              </button>
            )
          })}
          <label
            className={cn(
              'relative flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line pr-3 pl-1.5 text-[13px] text-muted sm:h-9',
              isCustom && 'border-ink text-text',
            )}
          >
            <input
              type="color"
              value={draft.accent}
              onChange={(e) => onChange({ accent: e.target.value })}
              className="size-7 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
            />
            Custom
          </label>
        </div>
      </fieldset>
    </SectionCard>
  )
}
