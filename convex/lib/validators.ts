import { v, type Infer } from 'convex/values'

/**
 * Shapes shared by the schema and the function arguments, so a field is described once.
 * Value rules Convex validators can't express (lengths, ranges, formats) live in ./rules.ts.
 */

/** The look of the printed page (see src/components/document). */
export const layoutId = v.union(
  v.literal('blush'),
  v.literal('classic'),
  v.literal('minimal'),
  v.literal('bold'),
)
export type LayoutId = Infer<typeof layoutId>

export const dateFormat = v.union(
  v.literal('d/m/yyyy'),
  v.literal('dd/mm/yyyy'),
  v.literal('d MMM yyyy'),
  v.literal('MMMM d, yyyy'),
  v.literal('yyyy-mm-dd'),
)

export const business = v.object({
  name: v.string(),
  regNo: v.string(),
  address: v.string(),
  email: v.string(),
  phone: v.string(),
})
export type Business = Infer<typeof business>

export const payment = v.object({
  accountName: v.string(),
  idLabel: v.string(),
  idNumber: v.string(),
  bankName: v.string(),
  accountNumber: v.string(),
  extra: v.string(),
})
export type Payment = Infer<typeof payment>

/** One of the user's own text columns (e.g. "Date", "Venue"). */
export const extraColumn = v.object({ id: v.string(), label: v.string() })
export type ExtraColumn = Infer<typeof extraColumn>

/**
 * The items table: headings (e.g. "Rate Per Session / Hour*"), whether Rate and Quantity are
 * shown (when not, each item is just an amount) and up to 3 extra text columns.
 */
export const columns = v.object({
  description: v.string(),
  rate: v.string(),
  quantity: v.string(),
  amount: v.string(),
  showRateQty: v.boolean(),
  extra: v.array(extraColumn),
})
export type Columns = Infer<typeof columns>

export const billTo = v.object({
  name: v.string(),
  address: v.string(),
  attention: v.string(),
})
export type BillTo = Infer<typeof billTo>

export const lineItem = v.object({
  id: v.string(),
  description: v.string(),
  rateSen: v.number(),
  quantity: v.number(),
  /** Values of the extra text columns, by column id. */
  extra: v.record(v.string(), v.string()),
})
export type LineItem = Infer<typeof lineItem>

/**
 * A saved invoice template: the look and terms of an invoice (business and bank details live
 * in the profile). Creating an invoice copies these onto it, so editing a template never
 * changes past invoices.
 */
export const templateFields = {
  name: v.string(),
  layout: layoutId,
  accent: v.string(),
  title: v.string(),
  currency: v.string(),
  dateFormat,
  /** Days from issue to due date; null = no due date. */
  dueDays: v.union(v.number(), v.null()),
  columns,
  notes: v.string(),
}
export const templateFieldsObject = v.object(templateFields)
export type TemplateFields = Infer<typeof templateFieldsObject>

export const invoiceStatus = v.union(v.literal('unpaid'), v.literal('paid'))

/** Everything the editor can change on an invoice (status has its own mutation). */
export const invoiceContent = {
  /** Only for you (never printed), e.g. "Astro – Oct 2026"; '' or missing = none. */
  name: v.optional(v.string()),
  number: v.string(),
  title: v.string(),
  layout: layoutId,
  accent: v.string(),
  currency: v.string(),
  dateFormat,
  issueDate: v.string(),
  /** '' = no due date. */
  dueDate: v.string(),
  clientId: v.optional(v.id('clients')),
  billTo,
  columns,
  items: v.array(lineItem),
  discountSen: v.number(),
  taxRateBps: v.number(),
  taxLabel: v.string(),
  notes: v.string(),
  from: business,
  payment,
  showPaidStamp: v.boolean(),
}
export const invoiceContentObject = v.object(invoiceContent)
export type InvoiceContent = Infer<typeof invoiceContentObject>

export const clientFields = {
  name: v.string(),
  address: v.string(),
  attention: v.string(),
  email: v.string(),
  notes: v.string(),
}
export const clientFieldsObject = v.object(clientFields)
export type ClientFields = Infer<typeof clientFieldsObject>
