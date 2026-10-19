import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/cn'

export const DREAVELAB_URL = 'https://dreavelab.com/'

/** "Privacy · Terms · Powered by DreaveLab", at the foot of every page. */
export function SiteFooter({ className = '' }: { className?: string }) {
  const link =
    'inline-flex min-h-11 items-center underline-offset-4 hover:text-text hover:underline'
  return (
    <footer
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-4 text-[13px] text-muted',
        className,
      )}
    >
      <nav aria-label="Legal" className="flex gap-4">
        <Link to="/privacy" className={link}>
          Privacy
        </Link>
        <Link to="/terms" className={link}>
          Terms
        </Link>
      </nav>
      <a href={DREAVELAB_URL} target="_blank" rel="noopener noreferrer" className={link}>
        {/* One flex item, so the space before the name survives. */}
        <span>
          Powered by <span className="font-medium text-text">DreaveLab</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
      </a>
    </footer>
  )
}
