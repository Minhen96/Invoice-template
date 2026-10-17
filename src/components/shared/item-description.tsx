import type { Doc } from '@convex/_generated/dataModel'
import { formatSen } from '@convex/lib/money'
import { useId, useState, type KeyboardEvent } from 'react'

import { inputClass } from '@/components/ui/field'
import { cn } from '@/lib/cn'

import { matchItems } from '@/lib/item-match'

interface ItemDescriptionProps {
  id: string
  value: string
  remembered: readonly Doc<'items'>[]
  onChange: (description: string) => void
  onPick: (item: Doc<'items'>) => void
  /** One line to start with (it still grows as you type). */
  compact?: boolean
}

/**
 * The item's description, with suggestions from remembered items as you type (textbox + listbox:
 * ↑/↓ to move, Enter to pick, Esc to close).
 */
export function ItemDescription({
  id,
  value,
  remembered,
  onChange,
  onPick,
  compact = false,
}: ItemDescriptionProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const suggestions = open ? matchItems(remembered, value) : []
  const expanded = suggestions.length > 0

  function pick(item: Doc<'items'>) {
    onPick(item)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!expanded) {
      if (event.key === 'ArrowDown' && remembered.length > 0) {
        setOpen(true)
        setActive(0)
        event.preventDefault()
      }
      return
    }
    if (event.key === 'ArrowDown') {
      setActive((i) => (i + 1) % suggestions.length)
      event.preventDefault()
    } else if (event.key === 'ArrowUp') {
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
      event.preventDefault()
    } else if (event.key === 'Enter' && active >= 0) {
      const item = suggestions[active]
      if (item) pick(item)
      event.preventDefault()
    } else if (event.key === 'Escape') {
      setOpen(false)
      setActive(-1)
      event.preventDefault()
    }
  }

  return (
    <div className="relative">
      <textarea
        id={id}
        // A multi-line textbox can't take the combobox role; the textbox + listbox pattern
        // (aria-autocomplete / aria-controls / aria-activedescendant) is valid on it.
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${String(active)}` : undefined}
        value={value}
        rows={compact ? 1 : 2}
        maxLength={2000}
        placeholder={
          compact ? 'Type or pick a past item' : 'What is it for? Start typing to reuse a past item'
        }
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setActive(-1)
        }}
        onKeyDown={onKeyDown}
        className={cn(
          inputClass,
          '[field-sizing:content] min-h-11 resize-y py-2.5 leading-relaxed',
          compact && 'resize-none py-2 sm:min-h-9 sm:text-sm',
        )}
      />
      <div
        id={listId}
        role="listbox"
        aria-label="Past items"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-pop"
      >
        {suggestions.map((item, index) => (
          <div
            key={item._id}
            id={`${listId}-${String(index)}`}
            role="option"
            aria-selected={index === active}
            // Focus stays in the textbox (aria-activedescendant); -1 keeps options out of Tab order.
            tabIndex={-1}
            // mousedown (not click) so the textarea doesn't blur and close the list first.
            onMouseDown={(e) => {
              e.preventDefault()
              pick(item)
            }}
            className={cn(
              'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[14px]',
              index === active ? 'bg-sunken' : 'hover:bg-sunken',
            )}
          >
            <span className="line-clamp-2 whitespace-pre-line">{item.description}</span>
            <span className="shrink-0 text-muted tabular">{formatSen(item.rateSen)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
