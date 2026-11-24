import { describe, expect, it } from 'vitest'
import { tripPreset } from './trips'

describe('tripPreset', () => {
  it('prepares sea and training trips with different needs', () => {
    expect(tripPreset('Море')).toMatchObject({ beach: true, training: false, style: 'Пляжный' })
    expect(tripPreset('Сборы')).toMatchObject({ beach: false, training: true, laundry: true, style: 'Спортивный' })
    expect(tripPreset('Короткая поездка').baggage).toBe('Ручная кладь')
  })
})
