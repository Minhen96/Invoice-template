import { v, type Infer } from 'convex/values'

/**
 * Shapes shared by the schema and the function arguments, so a field is described once.
 * Value rules Convex validators can't express (lengths, ranges, formats) live in ./rules.ts.
 */

export const templateId = v.union(
  v.literal('blush'),
  v.literal('classic'),
  v.literal('minimal'),
  v.literal('bold'),
)
export type TemplateId = Infer<typeof templateId>

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

/** Column headings on the items table, e.g. "Rate Per Session / Hour*". */
export const labels = v.object({
  description: v.string(),
  rate: v.string(),
  quantity: v.string(),
  amount: v.string(),
})
export type Labels = Infer<typeof labels>

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
})
export type LineItem = Infer<typeof lineItem>

export const profileDefaults = v.object({
  title: v.string(),
  currency: v.string(),
  dateFormat,
  /** Days from issue to due date; null = no due date. */
  dueDays: v.union(v.number(), v.null()),
  template: templateId,
  accent: v.string(),
  notes: v.string(),
  labels,
})
export type ProfileDefaults = Infer<typeof profileDefaults>

export const invoiceStatus = v.union(v.literal('unpaid'), v.literal('paid'))

/** Everything the editor can change on an invoice (status has its own mutation). */
export const invoiceContent = {
  number: v.string(),
  title: v.string(),
  template: templateId,
  accent: v.string(),
  currency: v.string(),
  dateFormat,
  issueDate: v.string(),
  /** '' = no due date. */
  dueDate: v.string(),
  clientId: v.optional(v.id('clients')),
  billTo,
  labels,
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
