import type { Business, Columns, LayoutId, Payment, TemplateFields } from './validators'

export const LAYOUTS: readonly { id: LayoutId; name: string }[] = [
  { id: 'blush', name: 'Blush' },
  { id: 'classic', name: 'Classic' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'bold', name: 'Bold' },
]

/** Accent swatches offered in the editor. Each one passes AA contrast as text on white. */
export const ACCENTS: readonly { value: string; name: string }[] = [
  { value: '#c2185b', name: 'Rose' },
  { value: '#6d28d9', name: 'Violet' },
  { value: '#1d4ed8', name: 'Blue' },
  { value: '#047857', name: 'Green' },
  { value: '#b45309', name: 'Amber' },
  { value: '#18181b', name: 'Ink' },
]

export const MAX_EXTRA_COLUMNS = 3

export const DEFAULT_COLUMNS: Columns = {
  description: 'Description',
  rate: 'Rate',
  quantity: 'Quantity',
  amount: 'Total',
  showRateQty: true,
  extra: [],
}

export const EMPTY_BUSINESS: Business = { name: '', regNo: '', address: '', email: '', phone: '' }

export const EMPTY_PAYMENT: Payment = {
  accountName: '',
  idLabel: 'IC No',
  idNumber: '',
  bankName: '',
  accountNumber: '',
  extra: '',
}

/** Starting point for a new template. */
export const DEFAULT_TEMPLATE: TemplateFields = {
  name: 'My template',
  layout: 'blush',
  accent: '#c2185b',
  title: 'INVOICE',
  currency: 'RM',
  dateFormat: 'd/m/yyyy',
  dueDays: 30,
  columns: DEFAULT_COLUMNS,
  notes: '',
}
