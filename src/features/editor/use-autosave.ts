import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { InvoiceContent } from '@convex/lib/validators'
import { useMutation } from 'convex/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { errorCode, errorMessage } from '@/lib/errors'

export type SaveState = 'saved' | 'pending' | 'saving' | 'error'

export const AUTOSAVE_DELAY_MS = 700

interface SaveError {
  message: string
  code: string | null
}

/**
 * Saves the editor's draft shortly after typing stops. Saves run one at a time and always send
 * the latest draft, so a slow network can't make an older version win. Leaving the editor saves
 * straight away; closing the tab with unsaved changes asks first.
 */
export function useAutosave(id: Id<'invoices'>, draft: InvoiceContent) {
  const update = useMutation(api.invoices.update)
  const draftJson = JSON.stringify(draft)
  const [savedJson, setSavedJson] = useState(draftJson)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<SaveError | null>(null)

  // Read by callbacks (timers, unmount, beforeunload), never during render.
  const latest = useRef({ draft, json: draftJson })
  const lastSaved = useRef(draftJson)
  const queue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    latest.current = { draft, json: draftJson }
  }, [draft, draftJson])

  const save = useCallback((): Promise<void> => {
    queue.current = queue.current.then(async () => {
      const { draft: snapshot, json } = latest.current
      if (json === lastSaved.current) return
      setSaving(true)
      setError(null)
      try {
        await update({ id, content: snapshot })
        lastSaved.current = json
        setSavedJson(json)
      } catch (e) {
        setError({
          message: errorMessage(e, "Couldn't save. Check your connection."),
          code: errorCode(e),
        })
      } finally {
        setSaving(false)
      }
    })
    return queue.current
  }, [id, update])

  const dirty = draftJson !== savedJson

  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [draftJson, dirty, save])

  // Save immediately when leaving the editor.
  useEffect(
    () => () => {
      void save()
    },
    [save],
  )

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (latest.current.json !== lastSaved.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
    }
  }, [])

  const state: SaveState = error ? 'error' : saving ? 'saving' : dirty ? 'pending' : 'saved'
  return { state, error, flush: save }
}
