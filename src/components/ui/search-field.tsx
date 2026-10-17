import { Search } from 'lucide-react'

import { cn } from '@/lib/cn'

import { inputClass } from './field'

interface SearchFieldProps {
  /** Read by screen readers, e.g. "Search clients". */
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  className?: string
}

/** The search box used above every list. */
export function SearchField({ label, value, placeholder, onChange, className }: SearchFieldProps) {
  return (
    <label className={cn('relative block sm:w-72', className)}>
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        className={cn(inputClass, 'h-11 pl-9 sm:h-9 sm:text-sm')}
      />
    </label>
  )
}
