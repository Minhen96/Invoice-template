import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { errorMessage } from '@/lib/errors'

export function DeleteTemplateDialog({
  template,
  onClose,
  onDeleted,
}: {
  template: { _id: Id<'templates'>; name: string } | null
  onClose: () => void
  onDeleted?: () => void
}) {
  const remove = useMutation(api.templates.remove)
  const [pending, setPending] = useState(false)

  async function confirm() {
    if (!template) return
    setPending(true)
    try {
      await remove({ id: template._id })
      toast.success('Template deleted')
      onClose()
      onDeleted?.()
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete the template."))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={template !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={`Delete ${template?.name.trim() ? template.name : 'template'}?`}
      description="Invoices already made with it stay as they are."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={pending} onClick={() => void confirm()}>
            Delete template
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm text-muted">You won&apos;t be able to make new invoices from it.</p>
    </Dialog>
  )
}
