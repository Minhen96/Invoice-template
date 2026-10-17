import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { PAGE_HEIGHT, PAGE_WIDTH } from './invoice-document'

interface PaperPreviewProps {
  children: ReactNode
  className?: string
  /** Largest scale to show at (1 = real size). */
  maxScale?: number
}

/**
 * Shows an A4 page shrunk to fit the available width, keeping its exact layout (it is the same
 * page that gets printed, just scaled with a CSS transform).
 */
export function PaperPreview({ children, className, maxScale = 1 }: PaperPreviewProps) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(maxScale)
  const [height, setHeight] = useState(PAGE_HEIGHT)

  useLayoutEffect(() => {
    const outerEl = outer.current
    const innerEl = inner.current
    if (!outerEl || !innerEl || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      setScale(Math.min(maxScale, outerEl.clientWidth / PAGE_WIDTH))
      setHeight(innerEl.offsetHeight || PAGE_HEIGHT)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(outerEl)
    observer.observe(innerEl)
    return () => {
      observer.disconnect()
    }
  }, [maxScale])

  return (
    // overflow-hidden: the page is shrunk with a transform, which doesn't shrink its layout box
    // (794px) — without clipping, phones would scroll sideways.
    <div
      ref={outer}
      className={cn('w-full overflow-hidden', className)}
      style={{ height: height * scale }}
    >
      <div
        ref={inner}
        className="origin-top-left overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgb(0_0_0/0.08),0_8px_28px_rgb(0_0_0/0.08)]"
        style={{ width: PAGE_WIDTH, transform: `scale(${String(scale)})` }}
      >
        {children}
      </div>
    </div>
  )
}
