import { AlertCircle, Check } from 'lucide-react'

import type { SaveState } from '@/hooks/use-autosave'

/**
 * "Auto-saved" / "Saving…" / error with Retry, next to an autosaving form's title. Says "auto"
 * so nobody looks for a Save button.
 */
export function SaveIndicator({
  state,
  message,
  onRetry,
}: {
  state: SaveState
  message: string | undefined
  onRetry: () => void
}) {
  if (state === 'error') {
    return (
      <span role="alert" className="flex items-center gap-1.5 text-[13px] text-danger">
        <AlertCircle aria-hidden="true" className="size-4" />
        {message ?? "Couldn't save."}
        <button
          type="button"
          onClick={onRetry}
          className="font-medium underline underline-offset-2"
        >
          Retry
        </button>
      </span>
    )
  }
  return (
    <span aria-live="polite" className="flex items-center gap-1.5 text-[13px] text-muted">
      {state === 'saved' ? (
        <>
          <Check aria-hidden="true" className="size-4" /> Auto-saved
        </>
      ) : (
        'Saving…'
      )}
    </span>
  )
}
