import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useAction, useMutation } from 'convex/react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'

const MAX_LOGO_BYTES = 1024 * 1024

/** Upload / replace / remove a template's logo (checked again on the server). */
export function LogoField({
  templateId,
  logoUrl,
}: {
  templateId: Id<'templates'>
  logoUrl: string | null
}) {
  const generateUploadUrl = useMutation(api.templates.generateLogoUploadUrl)
  const setLogo = useAction(api.templates.setLogo)
  const removeLogo = useMutation(api.templates.removeLogo)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Please use an image under 1 MB.')
      return
    }
    setBusy(true)
    try {
      const url = await generateUploadUrl()
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('upload failed')
      const { storageId } = (await response.json()) as { storageId: string }
      await setLogo({ id: templateId, storageId: storageId as Id<'_storage'> })
      toast.success('Logo updated')
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't use that image. Try a PNG or JPG under 1 MB."))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-28 items-center justify-center rounded-xl border border-dashed border-line-strong bg-raised p-2">
        {logoUrl ? (
          <img src={logoUrl} alt="Your logo" className="max-h-full max-w-full object-contain" />
        ) : (
          <ImagePlus aria-hidden="true" className="size-5 text-muted" />
        )}
      </div>
      <div className="flex flex-col items-start gap-1">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Logo image file"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
          }}
        />
        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            loading={busy}
            onClick={() => input.current?.click()}
          >
            {logoUrl ? 'Change logo' : 'Add logo'}
          </Button>
          {logoUrl ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                void removeLogo({ id: templateId }).then(() => toast.success('Logo removed'))
              }}
            >
              <Trash2 /> Remove
            </Button>
          ) : null}
        </div>
        <span className="text-[12.5px] text-muted">Optional. PNG, JPG or WebP, up to 1 MB.</span>
      </div>
    </div>
  )
}
