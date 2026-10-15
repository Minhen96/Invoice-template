import { DropdownMenu } from 'radix-ui'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

interface MenuProps {
  /** The button that opens the menu (rendered as-is, must accept a ref). */
  trigger: ReactNode
  items: readonly (MenuItem | 'separator')[]
  align?: 'start' | 'end'
}

/** Keyboard-accessible dropdown menu (Radix): arrows, Enter, Esc and type-ahead all work. */
export function Menu({ trigger, items, align = 'end' }: MenuProps) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-52 rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          {items.map((item, index) =>
            item === 'separator' ? (
              <DropdownMenu.Separator key={`sep-${index}`} className="my-1 h-px bg-line" />
            ) : (
              <DropdownMenu.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  'flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[14px] outline-none select-none sm:h-9',
                  'data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-sunken',
                  '[&_svg]:size-4 [&_svg]:text-muted',
                  item.danger && 'text-danger [&_svg]:text-danger',
                )}
              >
                {item.icon}
                {item.label}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
