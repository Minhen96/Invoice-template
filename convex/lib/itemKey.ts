/**
 * How remembered items are matched: case, spacing and line breaks don't matter, so
 * "Full time announcer  OCT 2026" and "FULL TIME ANNOUNCER OCT 2026" are the same item.
 */
export function itemKey(description: string): string {
  return description.trim().replace(/\s+/g, ' ').toLowerCase()
}
