import { describe, expect, it } from 'vitest'
import { supportsLength, supportsWarmth } from './taxonomy'

describe('conditional item fields', () => {
  it('shows length only for dresses and skirts', () => {
    expect(supportsLength('Платье')).toBe(true)
    expect(supportsLength('Низ', 'Юбка мини')).toBe(true)
    expect(supportsLength('Низ', 'Джинсы')).toBe(false)
  })

  it('does not ask skirts for warmth', () => {
    expect(supportsWarmth('Низ')).toBe(false)
    expect(supportsWarmth('Верхняя одежда')).toBe(true)
  })
})
