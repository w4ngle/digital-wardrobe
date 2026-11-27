import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
await supabase.from('items').update({ style: 'Пляжный' }).eq('style', 'Отпускной').contains('ai_meta', { demo: true })
for (const pattern of ['Полоска', 'Цветочный', 'Анималистичный']) {
  await supabase.from('items').update({ pattern: 'Разноцветная' }).eq('pattern', pattern).contains('ai_meta', { demo: true })
}
const { data: rows, error } = await supabase.from('items').select('*')
if (error) throw error

const demo = rows.filter((item) => item.ai_meta?.demo)
const target = 200
const missing = Math.max(0, target - demo.length)
if (!missing) {
  console.log(`Готово: уже ${demo.length} демо-вещей`)
  process.exit(0)
}

const byCategory = [...Map.groupBy(demo, (item) => item.category).values()]
const sources = Array.from({ length: missing }, (_, index) => byCategory[index % byCategory.length][Math.floor(index / byCategory.length) % byCategory[index % byCategory.length].length])
const colors = ['Чёрный', 'Белый', 'Шоколадный', 'Бордовый', 'Бежевый', 'Синий', 'Розовый', 'Зелёный']
const copies = sources.map((item, index) => ({
  photo_url: item.photo_url,
  category: item.category,
  subcategory: item.subcategory,
  color: colors[index % colors.length],
  season: item.season,
  style: item.style,
  description: item.description,
  custom_name: `${colors[index % colors.length]} ${(item.subcategory || item.category).toLowerCase()}`,
  warmth: item.warmth,
  formality: item.formality,
  fit: item.fit,
  length: item.length,
  pattern: ['Однотонная', 'Разноцветная', 'Клетка', 'Горошек', 'Абстрактный принт', 'Кружево', 'Сетка / полупрозрачная', 'Фактурная'][index % 8],
  layer_role: item.layer_role,
  comfort: Math.max(1, Math.min(5, (item.comfort || 3) + (index % 3) - 1)),
  confidence: Math.max(1, Math.min(5, (item.confidence || 3) + ((index + 1) % 3) - 1)),
  needs_underlayer: item.needs_underlayer,
  rain_safe: item.rain_safe,
  availability: 'available',
  ai_meta: { ...item.ai_meta, demo: true, source: 'demo-variant' },
}))

const inserted = await supabase.from('items').insert(copies)
if (inserted.error) throw inserted.error
console.log(`Готово: добавлено ${missing}, всего ${target} демо-вещей`)
