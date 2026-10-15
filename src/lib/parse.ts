import { parseMoney, senToInput } from '@convex/lib/money'

/** Parsers/formatters for the editor's number boxes. Blank means zero. */

export const money = {
  parse: parseMoney,
  format: (sen: number) => (sen === 0 ? '' : senToInput(sen)),
}

export const quantity = {
  parse: (text: string): number | null => {
    const cleaned = text.replace(/[\s,]/g, '')
    if (cleaned === '') return 0
    if (!/^\d{1,7}(\.\d{0,3})?$/.test(cleaned)) return null
    return Number(cleaned)
  },
  format: (value: number) => String(value),
}

/** Percent text ("8", "6.5") ↔ basis points (800, 650). */
export const percent = {
  parse: (text: string): number | null => {
    const cleaned = text.replace(/[\s%]/g, '')
    if (cleaned === '') return 0
    if (!/^\d{1,3}(\.\d{0,2})?$/.test(cleaned)) return null
    const bps = Math.round(Number(cleaned) * 100)
    return bps > 10_000 ? null : bps
  },
  format: (bps: number) => (bps === 0 ? '' : String(bps / 100)),
}
