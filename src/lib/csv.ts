/**
 * Build a CSV file (Excel-friendly). Cells are quoted when needed, and cells that a spreadsheet
 * would run as a formula (=, +, -, @, tab, CR) are prefixed with ' — a client name like
 * "=HYPERLINK(…)" stays plain text (CSV injection, OWASP).
 */
export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n')
}

function cell(value: string | number): string {
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}
