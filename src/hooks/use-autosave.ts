import { useCallback, useEffect, useRef, useState } from 'react'

import { errorCode, errorMessage } from '@/lib/errors'

export type SaveState = 'saved' | 'pending' | 'saving' | 'error'

export const AUTOSAVE_DELAY_MS = 700

export interface SaveError {
  message: string
  code: string | null
}

/**
 * Saves `value` shortly after it stops changing (used by the invoice and template editors).
 * Saves run one at a time and always send the latest value, so a slow network can't make an
 * older version win. Leaving the page saves straight away; closing the tab with unsaved changes
 * asks first.
 */
export function useAutosave<T>(value: T, save: (value: T) => Promise<unknown>) {
  const json = JSON.stringify(value)
  const [savedJson, setSavedJson] = useState(json)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<SaveError | null>(null)

  // Read by callbacks (timers, unmount, beforeunload), never during render.
  const latest = useRef({ value, json, save })
  const lastSaved = useRef(json)
  const queue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    latest.current = { value, json, save }
  }, [value, json, save])

  const flush = useCallback((): Promise<void> => {
    queue.current = queue.current.then(async () => {
      const { value: snapshot, json: snapshotJson, save: run } = latest.current
      if (snapshotJson === lastSaved.current) return
      setSaving(true)
      setError(null)
      try {
        await run(snapshot)
        lastSaved.current = snapshotJson
        setSavedJson(snapshotJson)
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
  }, [])

  const dirty = json !== savedJson

  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [json, dirty, flush])

  // Save immediately when leaving the page.
  useEffect(
    () => () => {
      void flush()
    },
    [flush],
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
  return { state, error, flush }
}
