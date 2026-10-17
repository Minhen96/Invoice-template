import type { LineItem } from '@convex/lib/validators'

/** A new, empty invoice item. */
export function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', rateSen: 0, quantity: 1, extra: {} }
}

export function moveItem(items: readonly LineItem[], index: number, by: -1 | 1): LineItem[] {
  const target = index + by
  if (target < 0 || target >= items.length) return [...items]
  const next = [...items]
  const [moved] = next.splice(index, 1)
  if (moved) next.splice(target, 0, moved)
  return next
}

/** Nothing typed at all — safe to drop. */
export function isBlankItem(item: LineItem): boolean {
  return (
    item.description.trim() === '' &&
    item.rateSen === 0 &&
    Object.values(item.extra).every((value) => value.trim() === '')
  )
}
