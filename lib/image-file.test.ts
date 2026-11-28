import { describe, expect, it } from 'vitest'
import { looksLikeSupportedImage } from './image-file'

describe('looksLikeSupportedImage', () => {
  it('accepts real image signatures', () => {
    expect(looksLikeSupportedImage(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(true)
    expect(looksLikeSupportedImage(new TextEncoder().encode('RIFF0000WEBP'), 'image/webp')).toBe(true)
  })

  it('rejects text renamed as an image', () => {
    expect(looksLikeSupportedImage(new TextEncoder().encode('not an image'), 'image/png')).toBe(false)
  })
})
