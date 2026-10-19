import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import type { LogoChange } from './use-save-logo'

const MAX_LOGO_BYTES = 1024 * 1024

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('read failed'))
    }
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

/** Pick / replace / remove the logo; nothing is uploaded until the template is saved. */
export function LogoField({
  logoUrl,
  onChange,
}: {
  /** What the template will show: the saved logo, or the picked one. */
  logoUrl: string | null
  onChange: (change: LogoChange) => void
}) {
  const input = useRef<HTMLInputElement>(null)

  async function pick(file: File) {
    if (input.current) input.current.value = ''
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Please use an image under 1 MB.')
      return
    }
    try {
      onChange({ kind: 'set', file, previewUrl: await readAsDataUrl(file) })
    } catch {
      toast.error("Couldn't read that image. Try a PNG or JPG under 1 MB.")
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
            if (file) void pick(file)
          }}
        />
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
            {logoUrl ? 'Change logo' : 'Add logo'}
          </Button>
          {logoUrl ? (
            <Button variant="ghost" size="sm" onClick={() => onChange({ kind: 'remove' })}>
              <Trash2 /> Remove
            </Button>
          ) : null}
        </div>
        <span className="text-[12.5px] text-muted">Optional. PNG, JPG or WebP, up to 1 MB.</span>
      </div>
    </div>
  )
}
