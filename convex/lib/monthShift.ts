import { MONTHS } from './dates'

// Month names (short or full, any case), optionally followed by a 4-digit year: "OCT 2026",
// "October, 2026", "Sept". Word boundaries stop matches inside words ("Marching", "Mayor").
const MONTH_RE =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b(,?\s+(\d{4})\b)?/gi

function matchCase(source: string, word: string): string {
  if (source === source.toUpperCase()) return word.toUpperCase()
  if (source === source.toLowerCase()) return word.toLowerCase()
  return word
}

/**
 * Only words that are clearly months are moved: anything followed by a year ("may 2026"),
 * ALL CAPS ("OCT"), or Title Case ("Oct", "October"). Lower-case words without a year are left
 * alone ("you may pay", "mar the finish"), and so is a bare "May" (could start a sentence).
 */
function isClearlyMonth(word: string, hasYear: boolean): boolean {
  if (hasYear) return true
  if (word === word.toUpperCase()) return true
  const first = word.slice(0, 1)
  const titleCase = first === first.toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()
  return titleCase && word.toLowerCase() !== 'may'
}

/**
 * Move every month mentioned in `text` by `delta` months, rolling the year when one follows.
 * Used by "Duplicate for next month": "FULL TIME ANNOUNCER OCT 2026" → "… NOV 2026",
 * "Retainer December 2026" → "Retainer January 2027". Keeps the original style (short/full,
 * UPPER/lower/Title).
 */
export function shiftMonths(text: string, delta: number): string {
  return text.replace(MONTH_RE, (all, word: string, yearPart?: string, year?: string) => {
    const hasYear = yearPart !== undefined && year !== undefined
    if (!isClearlyMonth(word, hasYear)) return all
    const index = MONTHS.findIndex(
      (m) => m.slice(0, 3).toLowerCase() === word.slice(0, 3).toLowerCase(),
    )
    if (index < 0) return all
    const total = index + delta
    const newIndex = ((total % 12) + 12) % 12
    const yearShift = Math.floor(total / 12)
    const full = MONTHS[newIndex] ?? ''
    // "May" is both short and full; treat 3-letter words (and "Sept") as the short style.
    const isShort = word.length <= 3 || word.toLowerCase() === 'sept'
    const replaced = matchCase(word, isShort ? full.slice(0, 3) : full)
    if (!hasYear) return replaced
    return replaced + yearPart.replace(year, String(Number(year) + yearShift))
  })
}
