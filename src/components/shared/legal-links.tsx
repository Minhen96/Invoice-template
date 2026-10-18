import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/cn'

/** "Privacy · Terms", for the foot of the sign-in pages and the Account page. */
export function LegalLinks({ className = '' }: { className?: string }) {
  const link =
    'inline-flex min-h-11 items-center underline-offset-4 hover:text-text hover:underline'
  return (
    <nav aria-label="Legal" className={cn('flex gap-4 text-[13px] text-muted', className)}>
      <Link to="/privacy" className={link}>
        Privacy
      </Link>
      <Link to="/terms" className={link}>
        Terms
      </Link>
    </nav>
  )
}
