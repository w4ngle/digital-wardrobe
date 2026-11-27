import { describe, expect, it } from 'vitest'
import { localDemoPhoto, uniqueDemoItems } from './demo-items'
import { Item } from './supabase'

const item = (id: string, name: string, photo: string, demo = true) => ({ id, custom_name: name, photo_url: photo, category: 'Комплект', subcategory: 'Волейбольная форма', color: 'Чёрный', season: 'Всесезонное', style: 'Спортивный', created_at: '', ai_meta: demo ? { demo: true } : null }) as Item

describe('uniqueDemoItems', () => {
  it('hides demo copies by photo or normalized name but preserves user items', () => {
    const result = uniqueDemoItems([
      item('1', 'Тестовая волейбольная форма', 'same.png'),
      item('2', 'Тестовая волейбольная форма · вариант 2', 'other.png'),
      item('3', 'Другая форма', 'same.png'),
      item('4', 'Тестовая волейбольная форма', 'user.png', false),
    ])
    expect(result.map(({ id }) => id)).toEqual(['1', '4'])
  })

  it('uses bundled WebP only for known demo photos', () => {
    expect(localDemoPhoto(item('1', 'Футболка', 'demo-core/white-tshirt.png')))
      .toBe('/demo-items/white-tshirt.webp?source=demo-core%2Fwhite-tshirt.png')
    expect(localDemoPhoto(item('2', 'Старое демо', 'private-id.png'))).toBeNull()
    expect(localDemoPhoto(item('3', 'Личная вещь', 'demo-core/white-tshirt.png', false))).toBeNull()
  })
})
