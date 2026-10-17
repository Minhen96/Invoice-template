import { ACCENTS, LAYOUTS } from '@convex/lib/defaults'
import type { LayoutId } from '@convex/lib/validators'
import { Check } from 'lucide-react'

import { InvoiceDocument, PaperPreview, type DocumentInvoice } from '@/components/document'
import { cn } from '@/lib/cn'

interface LookPickerProps {
  layout: LayoutId
  accent: string
  /** Shown in the thumbnails, so each one previews the real content. */
  preview: DocumentInvoice
  logoUrl: string | null
  onChange: (patch: { layout?: LayoutId; accent?: string }) => void
}

/** Layout thumbnails (live) + accent colour swatches. */
export function LookPicker({ layout, accent, preview, logoUrl, onChange }: LookPickerProps) {
  const isCustom = !ACCENTS.some((a) => a.value.toLowerCase() === accent.toLowerCase())
  return (
    <>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium text-muted">Layout</legend>
        <div className="grid grid-cols-4 gap-2.5">
          {LAYOUTS.map((option) => {
            const selected = layout === option.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ layout: option.id })}
                className="group flex min-w-0 flex-col items-center gap-1.5 rounded-lg text-[12.5px] font-medium"
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
                      invoice={{ ...preview, layout: option.id, accent }}
                      logoUrl={logoUrl}
                    />
                  </PaperPreview>
                </span>
                <span className={cn('text-muted', selected && 'text-text')}>{option.name}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 mt-5 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium text-muted">Accent colour</legend>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENTS.map((option) => {
            const selected = option.value.toLowerCase() === accent.toLowerCase()
            return (
              <button
                key={option.value}
                type="button"
                aria-label={option.name}
                aria-pressed={selected}
                onClick={() => onChange({ accent: option.value })}
                className={cn(
                  'flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-surface sm:size-9',
                  selected && 'ring-2 ring-ink',
                )}
              >
                <span
                  className="flex size-7 items-center justify-center rounded-full"
                  style={{ background: option.value }}
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
              value={accent}
              onChange={(e) => onChange({ accent: e.target.value })}
              className="size-7 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
            />
            Custom
          </label>
        </div>
      </fieldset>
    </>
  )
}
