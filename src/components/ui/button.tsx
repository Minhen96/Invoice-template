import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, Ref } from 'react'

import { cn } from '@/lib/cn'

import { Spinner } from './spinner'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:size-[18px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-onink hover:bg-ink/88',
        secondary: 'border border-line bg-surface text-text shadow-card hover:bg-raised',
        ghost: 'text-muted hover:bg-sunken hover:text-text',
        danger: 'bg-danger text-onink hover:bg-danger/90',
        link: 'h-auto px-0 text-text underline underline-offset-4 hover:text-muted',
      },
      size: {
        // Every size keeps a ≥ 44px touch target (WCAG 2.5.5).
        md: 'h-11 px-4 text-[15px]',
        sm: 'h-11 px-3 text-sm sm:h-9',
        icon: 'size-11 sm:size-9',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  )
}
