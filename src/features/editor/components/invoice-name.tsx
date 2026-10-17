import { PenLine } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { inputClass } from '@/components/ui/field'
import { cn } from '@/lib/cn'

interface InvoiceNameProps {
  /** Your own name for the invoice ('' = none). Never printed. */
  name: string
  number: string
  /** Omit to show the title only (outside edit mode). */
  onRename?: (name: string) => void
}

/** The page title: the invoice's name (number beside it), renamed in place. */
export function InvoiceName({ name, number, onRename }: InvoiceNameProps) {
  const [editing, setEditing] = useState(false)
  const label = number || 'Untitled'

  if (editing && onRename) {
    const finish = (value: string | null) => {
      if (value !== null) onRename(value.trim())
      setEditing(false)
    }
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') finish(event.currentTarget.value)
      if (event.key === 'Escape') finish(null)
    }
    return (
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="sr-only">{name || label}</h1>
        <input
          aria-label="Invoice name"
          // Focus moves here because the user just asked to rename.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          defaultValue={name}
          maxLength={200}
          placeholder="e.g. Astro – Oct 2026"
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            finish(e.currentTarget.value)
          }}
          className={cn(inputClass, 'h-11 w-64 max-w-full text-base font-semibold sm:h-9')}
        />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <h1 className="m-0 truncate text-xl font-semibold tracking-tight">{name || label}</h1>
      {name ? <span className="shrink-0 text-sm text-muted tabular">{label}</span> : null}
      {onRename ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={name ? 'Rename invoice' : 'Name this invoice'}
          title={name ? 'Rename (only you see the name)' : 'Add a name (only you see it)'}
          onClick={() => setEditing(true)}
        >
          <PenLine />
        </Button>
      ) : null}
    </div>
  )
}
