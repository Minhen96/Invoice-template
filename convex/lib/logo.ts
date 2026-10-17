/** Logos: small PNG/JPEG/WebP images, checked by their bytes (the browser's type can't be trusted). */

export const MAX_LOGO_BYTES = 1024 * 1024

/**
 * PNG, JPEG or WebP, judged by the file signature. No SVG: it can carry scripts if someone opens
 * the file URL directly.
 */
export function isSupportedImage(header: Uint8Array): boolean {
  const starts = (bytes: number[], offset = 0) => bytes.every((b, i) => header[offset + i] === b)
  const png = starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const jpeg = starts([0xff, 0xd8, 0xff])
  const webp = starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)
  return png || jpeg || webp
}
