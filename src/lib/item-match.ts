import type { Doc } from '@convex/_generated/dataModel'
import { itemKey } from '@convex/lib/itemKey'

const MAX_SUGGESTIONS = 6

/** Remembered items matching what's typed (most recent first); the 6 most recent when empty. */
export function matchItems(items: readonly Doc<'items'>[], text: string): Doc<'items'>[] {
  const typed = itemKey(text)
  return items
    .filter((item) => item.key !== typed && (typed === '' || item.key.includes(typed)))
    .slice(0, MAX_SUGGESTIONS)
}
