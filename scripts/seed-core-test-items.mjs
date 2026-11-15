import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const items = [
  ['white-tshirt.png', 'Белая базовая футболка', 'Верх', 'Футболка', 'Белый', 'Всесезонное', 'Повседневный', 2, 1, 'Обычная', null, 'Однотонная', 'Базовый слой', 5, 4, false, false],
  ['black-tshirt.png', 'Чёрная базовая футболка', 'Верх', 'Футболка', 'Чёрный', 'Всесезонное', 'Повседневный', 2, 1, 'По фигуре', null, 'Однотонная', 'Базовый слой', 5, 5, false, false],
  ['blue-shirt.png', 'Голубая рубашка', 'Верх', 'Рубашка', 'Голубой', 'Всесезонное', 'Деловой', 2, 4, 'Свободная', null, 'Полоска', 'Второй слой', 4, 4, false, false],
  ['burgundy-blouse.png', 'Бордовая нарядная блузка', 'Верх', 'Блузка', 'Бордовый', 'Всесезонное', 'Нарядный', 2, 4, 'По фигуре', null, 'Однотонная', 'Базовый слой', 4, 5, false, false],
  ['cream-sweater.png', 'Молочный тёплый свитер', 'Верх', 'Свитер', 'Молочный', 'Зима', 'Повседневный', 5, 2, 'Свободная', null, 'Однотонная', 'Второй слой', 5, 4, false, false],
  ['gray-hoodie.png', 'Серое худи', 'Верх', 'Худи', 'Серый', 'Демисезон', 'Спортивный', 4, 1, 'Оверсайз', null, 'Однотонная', 'Второй слой', 5, 4, false, false],
  ['sage-cardigan.png', 'Шалфейный кардиган', 'Верх', 'Кардиган', 'Зелёный', 'Демисезон', 'Повседневный', 3, 2, 'Свободная', null, 'Однотонная', 'Второй слой', 5, 4, false, false],
  ['blue-jeans.png', 'Синие прямые джинсы', 'Низ', 'Джинсы', 'Синий', 'Всесезонное', 'Повседневный', null, 2, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 5, 5, false, false],
  ['black-jeans.png', 'Чёрные прямые джинсы', 'Низ', 'Джинсы', 'Чёрный', 'Всесезонное', 'Повседневный', null, 2, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 5, 5, false, false],
  ['beige-trousers.png', 'Бежевые деловые брюки', 'Низ', 'Брюки', 'Бежевый', 'Всесезонное', 'Деловой', null, 4, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 4, 4, false, false],
  ['brown-trousers.png', 'Коричневые широкие брюки', 'Низ', 'Брюки', 'Коричневый', 'Демисезон', 'Повседневный', null, 3, 'Свободная', null, 'Однотонная', 'Самостоятельная вещь', 5, 5, false, false],
  ['black-leggings.png', 'Чёрные лосины', 'Низ', 'Лосины', 'Чёрный', 'Всесезонное', 'Спортивный', null, 1, 'Облегающая', null, 'Однотонная', 'Самостоятельная вещь', 5, 4, false, false],
  ['black-skirt.png', 'Чёрная юбка миди', 'Низ', 'Юбка миди', 'Чёрный', 'Всесезонное', 'Нарядный', null, 4, 'По фигуре', 'Миди', 'Однотонная', 'Самостоятельная вещь', 4, 5, false, false],
  ['champagne-skirt.png', 'Атласная юбка шампань', 'Низ', 'Юбка миди', 'Бежевый', 'Всесезонное', 'Нарядный', null, 4, 'Обычная', 'Миди', 'Однотонная', 'Самостоятельная вещь', 4, 5, false, false],
  ['white-sneakers.png', 'Белые повседневные кеды', 'Обувь', 'Кеды', 'Белый', 'Всесезонное', 'Повседневный', 2, 1, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 5, 5, false, false],
  ['black-sneakers.png', 'Чёрные кроссовки', 'Обувь', 'Кроссовки', 'Чёрный', 'Всесезонное', 'Повседневный', 2, 1, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 5, 5, false, true],
  ['gray-runners.png', 'Серые беговые кроссовки', 'Обувь', 'Спортивная обувь', 'Серый', 'Всесезонное', 'Спортивный', 2, 1, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 5, 4, false, true],
  ['brown-loafers.png', 'Коричневые лоферы', 'Обувь', 'Лоферы', 'Коричневый', 'Демисезон', 'Деловой', 2, 4, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 4, 4, false, false],
  ['burgundy-pumps.png', 'Бордовые туфли', 'Обувь', 'Туфли', 'Бордовый', 'Всесезонное', 'Нарядный', 2, 5, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 2, 5, false, false],
  ['black-boots.png', 'Чёрные демисезонные ботинки', 'Обувь', 'Ботинки', 'Чёрный', 'Демисезон', 'Повседневный', 4, 2, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 4, 4, false, true],
  ['gray-trench.png', 'Серый тренч', 'Верхняя одежда', 'Тренч', 'Серый', 'Демисезон', 'Деловой', 3, 4, 'Обычная', null, 'Однотонная', 'Верхняя одежда', 4, 5, false, true],
  ['camel-coat.png', 'Пальто цвета кэмел', 'Верхняя одежда', 'Пальто', 'Бежевый', 'Зима', 'Деловой', 5, 4, 'Обычная', null, 'Однотонная', 'Верхняя одежда', 4, 5, false, true],
  ['black-puffer.png', 'Чёрный зимний пуховик', 'Верхняя одежда', 'Пуховик', 'Чёрный', 'Зима', 'Повседневный', 5, 1, 'Оверсайз', null, 'Однотонная', 'Верхняя одежда', 5, 4, false, true],
  ['beige-handbag.png', 'Бежевая сумка', 'Сумка', 'Сумка', 'Бежевый', 'Всесезонное', 'Деловой', null, 4, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 5, 5, false, true],
  ['black-belt.png', 'Чёрный ремень', 'Аксессуар', 'Ремень', 'Чёрный', 'Всесезонное', 'Повседневный', null, 3, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 5, 5, false, true],
  ['burgundy-scarf.png', 'Бордовый тёплый шарф', 'Аксессуар', 'Шарф', 'Бордовый', 'Зима', 'Повседневный', null, 2, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 5, 4, false, false],
  ['green-cap.png', 'Зелёная кепка', 'Аксессуар', 'Головной убор', 'Зелёный', 'Лето', 'Спортивный', null, 1, 'Обычная', null, 'Однотонная', 'Самостоятельная вещь', 5, 4, false, false],
]

let added = 0
for (const [file, custom_name, category, subcategory, color, season, style, warmth, formality, fit, length, pattern, layer_role, comfort, confidence, needs_underlayer, rain_safe] of items) {
  const { data: existing, error: lookupError } = await supabase.from('items').select('id').eq('custom_name', custom_name).maybeSingle()
  if (lookupError) throw lookupError
  if (existing) continue

  const path = `demo-core/${file}`
  const upload = await supabase.storage.from('wardrobe-items').upload(path, await readFile(`public/demo-items/${file}`), { contentType: 'image/png', upsert: true })
  if (upload.error) throw upload.error

  const inserted = await supabase.from('items').insert({
    photo_url: path, custom_name, description: custom_name, category, subcategory, color, season, style,
    warmth, formality, fit, length, pattern, layer_role, comfort, confidence, needs_underlayer, rain_safe,
    availability: 'available', ai_meta: { demo: true, source: 'core-test-pool' },
  })
  if (inserted.error) throw inserted.error
  added++
}

console.log(`Готово: добавлено ${added}, в основном тестовом пуле ${items.length} вещей`)
