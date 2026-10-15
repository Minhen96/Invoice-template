import { Button } from '@/components/ui/button'

/** Shown when a page's data can't load (network down, session ended…). */
export function PageError({ what }: { what: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="m-0 font-medium">Couldn&apos;t load {what}.</p>
      <p className="m-0 text-sm text-muted">Check your connection and try again.</p>
      <Button variant="secondary" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  )
}
