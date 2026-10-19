import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

/** "Discard your changes?" — when cancelling or leaving a form with unsaved edits. */
export function DiscardDialog({
  open,
  message,
  onKeep,
  onDiscard,
}: {
  open: boolean
  /** What stays when discarding, e.g. "The invoice stays as it was before you edited it." */
  message: string
  onKeep: () => void
  onDiscard: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onKeep()
      }}
      title="Discard your changes?"
      description="You have changes that aren't saved yet."
      footer={
        <>
          <Button variant="secondary" onClick={onKeep}>
            Keep editing
          </Button>
          <Button variant="danger" onClick={onDiscard}>
            Discard changes
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm text-muted">{message}</p>
    </Dialog>
  )
}
