import { api } from '@convex/_generated/api'
import { formatSen } from '@convex/lib/money'
import { useConvex } from 'convex/react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { toCsv } from '@/lib/csv'
import { downloadFile } from '@/lib/download'
import { today } from '@/lib/today'

// Byte-order mark: tells Excel the file is UTF-8 (keeps non-English names intact).
const BOM = String.fromCharCode(0xfeff)

/** Download a copy: the invoice list for spreadsheets, or everything as a backup. */
export function DataDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const convex = useConvex()
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null)

  async function exportCsv() {
    setBusy('csv')
    try {
      const rows = await convex.query(api.invoices.list, {})
      const csv = toCsv([
        ['Number', 'Client', 'Issued', 'Due', 'Currency', 'Total', 'Status', 'Paid on'],
        ...rows.map((r) => [
          r.number,
          r.clientName,
          r.issueDate,
          r.dueDate,
          r.currency,
          formatSen(r.totalSen).replace(/,/g, ''),
          r.status,
          r.paidAt,
        ]),
      ])
      downloadFile(`invoices-${today()}.csv`, BOM + csv, 'text/csv;charset=utf-8')
    } catch {
      toast.error("Couldn't export. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  async function exportJson() {
    setBusy('json')
    try {
      const data = await convex.query(api.backup.exportData, {})
      const file = { exportedAt: new Date().toISOString(), ...data }
      downloadFile(
        `invoices-backup-${today()}.json`,
        JSON.stringify(file, null, 2),
        'application/json',
      )
    } catch {
      toast.error("Couldn't create the backup. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Your data"
      description="Download a copy any time."
    >
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={busy === 'csv'}
          onClick={() => void exportCsv()}
        >
          {busy === 'csv' ? null : <FileSpreadsheet />} Invoice list (CSV)
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={busy === 'json'}
          onClick={() => void exportJson()}
        >
          {busy === 'json' ? null : <Download />} Full backup (JSON)
        </Button>
      </div>
    </Dialog>
  )
}
