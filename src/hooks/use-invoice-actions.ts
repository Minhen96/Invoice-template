import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useNavigate } from '@tanstack/react-router'
import { useConvex, useMutation } from 'convex/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { printInvoice } from '@/components/document'
import { errorMessage } from '@/lib/errors'
import { today } from '@/lib/today'

/** How long "Undo" stays available after deleting. */
export const UNDO_MS = 6_000

/** Actions shared by the invoice list and the editor. */
export function useInvoiceActions() {
  const convex = useConvex()
  const navigate = useNavigate()
  const duplicateMutation = useMutation(api.invoices.duplicate)
  const setStatus = useMutation(api.invoices.setStatus)

  const duplicate = useCallback(
    async (id: Id<'invoices'>, nextMonth: boolean) => {
      try {
        const copyId = await duplicateMutation({ id, today: today(), nextMonth })
        toast.success(nextMonth ? 'Copied for next month — check the details' : 'Copy created')
        await navigate({ to: '/invoices/$id', params: { id: copyId } })
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't copy the invoice."))
      }
    },
    [duplicateMutation, navigate],
  )

  const markUnpaid = useCallback(
    async (id: Id<'invoices'>) => {
      try {
        await setStatus({ id, status: 'unpaid' })
        toast.success('Marked as unpaid')
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't update the invoice."))
      }
    },
    [setStatus],
  )

  /** Print / save as PDF from anywhere (loads the full invoice first). */
  const print = useCallback(
    async (id: Id<'invoices'>) => {
      try {
        const [invoice, profile] = await Promise.all([
          convex.query(api.invoices.get, { id }),
          convex.query(api.profiles.get, {}),
        ])
        if (!invoice) throw new Error('missing')
        await printInvoice(invoice, profile?.logoUrl ?? null)
      } catch {
        toast.error("Couldn't open the PDF. Please try again.")
      }
    },
    [convex],
  )

  return { duplicate, markUnpaid, print }
}

/**
 * Delete with "Undo": the row disappears at once, and is really deleted a few seconds later
 * unless undone. Leaving the page deletes immediately; closing the tab within those seconds
 * keeps the invoice (the safe direction).
 */
export function useDeleteWithUndo() {
  const remove = useMutation(api.invoices.remove)
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const removeRef = useRef(remove)
  useEffect(() => {
    removeRef.current = remove
  }, [remove])

  const commit = useCallback(
    (id: Id<'invoices'>) => {
      timers.current.delete(id)
      remove({ id }).catch((error: unknown) => {
        setHidden((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toast.error(errorMessage(error, "Couldn't delete the invoice."))
      })
    },
    [remove],
  )

  // Leaving the page: delete whatever is still waiting for its undo window.
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const [id, timer] of pending) {
        clearTimeout(timer)
        void removeRef.current({ id: id as Id<'invoices'> }).catch(() => undefined)
      }
      pending.clear()
    }
  }, [])

  const deleteInvoice = useCallback(
    (id: Id<'invoices'>, label: string) => {
      setHidden((prev) => new Set(prev).add(id))
      timers.current.set(
        id,
        setTimeout(() => {
          commit(id)
        }, UNDO_MS),
      )
      toast(`Deleted ${label}`, {
        duration: UNDO_MS,
        action: {
          label: 'Undo',
          onClick: () => {
            const timer = timers.current.get(id)
            if (timer) clearTimeout(timer)
            timers.current.delete(id)
            setHidden((prev) => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          },
        },
      })
    },
    [commit],
  )

  return { hidden, deleteInvoice }
}
