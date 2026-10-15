import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { InvoiceDocument } from './invoice-document'
import type { DocumentInvoice } from './view-model'

/** File-name friendly: "Invoice 2026031 - Astro Radio Sdn Bhd". */
export function printTitle(invoice: Pick<DocumentInvoice, 'title' | 'number' | 'billTo'>): string {
  const kind = invoice.title.trim() || 'Invoice'
  const name = kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase()
  const client = invoice.billTo.name.trim()
  return [`${name} ${invoice.number}`, client]
    .filter(Boolean)
    .join(' - ')
    .replace(/[\\/:*?"<>|]/g, '')
}

// Some mobile browsers never fire `afterprint`; the next print then tidies up the last one.
let pendingCleanUp: (() => void) | null = null

async function imagesReady(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map((img) => img.decode().catch(() => undefined)))
}

/**
 * Open the browser's print dialog for one invoice ("Save as PDF" gives a crisp, text-selectable
 * PDF). The page title becomes the suggested file name.
 */
export async function printInvoice(
  invoice: DocumentInvoice,
  logoUrl: string | null,
): Promise<void> {
  const container = document.getElementById('print-root')
  if (!container) throw new Error('#print-root is missing from index.html')
  pendingCleanUp?.()
  const root = createRoot(container)
  flushSync(() => {
    root.render(<InvoiceDocument invoice={invoice} logoUrl={logoUrl} />)
  })
  // Wait for the invoice fonts, where the browser can tell us (older browsers can't).
  if ('fonts' in document) await document.fonts.ready
  await imagesReady(container)

  const previousTitle = document.title
  document.title = printTitle(invoice)
  const cleanUp = () => {
    if (pendingCleanUp !== cleanUp) return
    pendingCleanUp = null
    document.title = previousTitle
    root.unmount()
  }
  pendingCleanUp = cleanUp
  // Chrome blocks in print() until the dialog closes; Safari returns at once and fires
  // `afterprint` later. Clean up on whichever comes last.
  window.addEventListener('afterprint', cleanUp, { once: true })
  window.print()
}
