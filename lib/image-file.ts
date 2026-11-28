const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value)

export function looksLikeSupportedImage(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return startsWith(bytes, [0xff, 0xd8, 0xff])
  if (type === 'image/png') return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (type === 'image/heic') {
    const brand = String.fromCharCode(...bytes.slice(4, 12))
    return brand.startsWith('ftyp') && /heic|heix|hevc|hevx|mif1/i.test(String.fromCharCode(...bytes.slice(8, 16)))
  }
  return false
}
