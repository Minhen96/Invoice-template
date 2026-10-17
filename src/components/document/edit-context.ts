import { createContext, useContext } from 'react'

/** Parts of the invoice that can be clicked to edit (in the editor only). */
export type EditPart =
  | { kind: 'billTo' | 'details' | 'totals' | 'notes' | 'from' | 'payment' | 'addItem' }
  | { kind: 'item'; id: string }

/**
 * Set only by the invoice editor. Everywhere else (PDF, previews, thumbnails) it's null, and the
 * document renders exactly as printed.
 */
export const EditContext = createContext<((part: EditPart) => void) | null>(null)

export function useEditing(): boolean {
  return useContext(EditContext) !== null
}
