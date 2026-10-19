import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useAction, useMutation } from 'convex/react'
import { useCallback } from 'react'

/** A logo change waiting for Save: a new image (with a preview), or taking the logo off. */
export type LogoChange = { kind: 'set'; file: File; previewUrl: string } | { kind: 'remove' } | null

/** Applies a pending logo change to a saved template (the server checks the image again). */
export function useSaveLogo() {
  const generateUploadUrl = useMutation(api.templates.generateLogoUploadUrl)
  const setLogo = useAction(api.templates.setLogo)
  const removeLogo = useMutation(api.templates.removeLogo)

  return useCallback(
    async (id: Id<'templates'>, change: LogoChange) => {
      if (change === null) return
      if (change.kind === 'remove') {
        await removeLogo({ id })
        return
      }
      const url = await generateUploadUrl()
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': change.file.type },
        body: change.file,
      })
      if (!response.ok) throw new Error('upload failed')
      const { storageId } = (await response.json()) as { storageId: string }
      await setLogo({ id, storageId: storageId as Id<'_storage'> })
    },
    [generateUploadUrl, setLogo, removeLogo],
  )
}
