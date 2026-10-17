import '@fontsource-variable/bodoni-moda'
import '@fontsource-variable/playfair-display'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import './document.css'

import { onColor } from './colour'
import { EditContext, type EditPart } from './edit-context'
import { PaidStamp } from './parts'
import { LayoutBody } from './layouts'
import { buildDocumentView, type DocumentInvoice } from './view-model'

export const PAGE_WIDTH = 794 // A4 at 96 dpi
export const PAGE_HEIGHT = 1123

interface InvoiceDocumentProps {
  invoice: DocumentInvoice
  logoUrl?: string | null
  /** Editor only: makes each part of the paper clickable. */
  onEdit?: ((part: EditPart) => void) | undefined
}

/** One printable A4 page in the invoice's chosen layout. */
export function InvoiceDocument({ invoice, logoUrl = null, onEdit }: InvoiceDocumentProps) {
  const view = buildDocumentView(invoice, logoUrl)
  const page = (
    <article
      className={`doc-page tpl-${invoice.layout}`}
      style={
        { '--accent': view.accent, '--on-accent': onColor(view.accent) } as React.CSSProperties
      }
      aria-label={`${view.title} ${view.number}`}
    >
      <LayoutBody layout={invoice.layout} view={view} />
      <PaidStamp view={view} />
    </article>
  )
  return onEdit ? <EditContext.Provider value={onEdit}>{page}</EditContext.Provider> : page
}
