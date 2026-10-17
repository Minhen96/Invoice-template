import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

import { SettingsRow } from './settings-row'

export interface PartyListRow {
  id: string
  title: string
  summary: string
  isDefault: boolean
  incomplete: boolean
  onOpen: () => void
}

interface PartyListDialogProps {
  open: boolean
  title: string
  rows: readonly PartyListRow[]
  /** e.g. "Add business". */
  addLabel: string
  onAdd: () => void
  onClose: () => void
}

/** Your businesses (or bank accounts): pick one to edit, or add another. */
export function PartyListDialog({
  open,
  title,
  rows,
  addLabel,
  onAdd,
  onClose,
}: PartyListDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={title}
      description={
        rows.length > 1 ? 'New invoices use the default unless a template picks another.' : null
      }
      footer={
        <Button variant="secondary" onClick={onAdd}>
          <Plus /> {addLabel}
        </Button>
      }
    >
      <div className="overflow-hidden rounded-xl border border-line">
        {rows.map((row) => (
          <SettingsRow
            key={row.id}
            title={row.title}
            summary={row.summary}
            isDefault={row.isDefault && rows.length > 1}
            incomplete={row.incomplete}
            onOpen={row.onOpen}
          />
        ))}
      </div>
    </Dialog>
  )
}
