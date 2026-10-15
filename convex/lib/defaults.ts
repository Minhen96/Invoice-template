import type { Business, Labels, Payment, ProfileDefaults, TemplateId } from './validators'

export const TEMPLATES: readonly { id: TemplateId; name: string }[] = [
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

export const DEFAULT_LABELS: Labels = {
  description: 'Description',
  rate: 'Rate',
  quantity: 'Quantity',
  amount: 'Total',
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

export const DEFAULT_PROFILE_DEFAULTS: ProfileDefaults = {
  title: 'INVOICE',
  currency: 'RM',
  dateFormat: 'd/m/yyyy',
  dueDays: 30,
  template: 'blush',
  accent: '#c2185b',
  notes: '',
  labels: DEFAULT_LABELS,
}
