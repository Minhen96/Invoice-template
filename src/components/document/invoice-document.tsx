import '@fontsource-variable/bodoni-moda'
import '@fontsource-variable/playfair-display'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import './document.css'

import { onColor } from './colour'
import { PaidStamp } from './parts'
import { TemplateBody } from './templates'
import { buildDocumentView, type DocumentInvoice } from './view-model'

export const PAGE_WIDTH = 794 // A4 at 96 dpi
export const PAGE_HEIGHT = 1123

interface InvoiceDocumentProps {
  invoice: DocumentInvoice
  logoUrl?: string | null
}

/** One printable A4 page in the invoice's chosen template. */
export function InvoiceDocument({ invoice, logoUrl = null }: InvoiceDocumentProps) {
  const view = buildDocumentView(invoice, logoUrl)
  return (
    <article
      className={`doc-page tpl-${invoice.template}`}
      style={
        { '--accent': view.accent, '--on-accent': onColor(view.accent) } as React.CSSProperties
      }
      aria-label={`${view.title} ${view.number}`}
    >
      <TemplateBody template={invoice.template} view={view} />
      <PaidStamp view={view} />
    </article>
  )
}
