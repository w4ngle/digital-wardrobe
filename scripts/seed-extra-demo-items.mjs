import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

const items = [
  ['generated-black-zip-hoodie.png', 'Чёрная укороченная зипка', 'Верх', 'Зипка', 'Чёрный', 'Демисезон', 'Повседневный', 3, 2, 'Свободная', 'Короткая', 'Однотонная', 'Второй слой', 5, 4, false, false],
  ['generated-white-lace-dress.png', 'Белое кружевное платье макси', 'Платье', 'Вечернее платье', 'Белый', 'Лето', 'Нарядный', 2, 5, 'По фигуре', 'Макси', 'Кружево', 'Самостоятельная вещь', 3, 5, true, false],
  ['generated-floral-dress.png', 'Летнее платье в цветочек', 'Платье', 'Платье мини', 'Разноцветный', 'Лето', 'Повседневный', 1, 3, 'По фигуре', 'Мини', 'Цветочный', 'Самостоятельная вещь', 4, 5, false, false],
  ['generated-black-boots.png', 'Чёрные зимние сапоги', 'Обувь', 'Сапоги', 'Чёрный', 'Зима', 'Повседневный', 5, 3, 'Обычная', 'Длинная', 'Однотонная', 'Самостоятельная вещь', 4, 4, false, true],
  ['generated-turquoise-bikini.png', 'Бирюзовый блестящий купальник', 'Купальник', 'Раздельный купальник', 'Бирюзовый', 'Лето', 'Отпускной', 1, 2, 'Облегающая', 'Короткая', 'Другой', 'Самостоятельная вещь', 4, 5, false, true],
  ['generated-white-bubble-skirt.png', 'Белая юбка-баллон', 'Низ', 'Юбка мини', 'Белый', 'Лето', 'Нарядный', 1, 4, 'Обычная', 'Мини', 'Однотонная', 'Самостоятельная вещь', 4, 5, false, false],
  ['generated-gray-pajamas.png', 'Серая мягкая пижама', 'Домашняя одежда', 'Пижама', 'Серый', 'Всесезонное', 'Повседневный', 3, 1, 'Свободная', 'Длинная', 'Однотонная', 'Самостоятельная вещь', 5, 3, false, false],
  ['generated-black-heels.png', 'Чёрные туфли на каблуке', 'Обувь', 'Туфли', 'Чёрный', 'Всесезонное', 'Нарядный', 2, 5, 'Обычная', 'Обычная', 'Однотонная', 'Самостоятельная вещь', 2, 5, false, false],
  ['generated-black-shoulder-bag.png', 'Маленькая чёрная сумка', 'Сумка', 'Сумка', 'Чёрный', 'Всесезонное', 'Нарядный', 2, 4, 'Обычная', 'Обычная', 'Однотонная', 'Самостоятельная вещь', 4, 5, false, true],
  ['generated-black-leather-jacket.png', 'Чёрная кожаная косуха', 'Верхняя одежда', 'Куртка', 'Чёрный', 'Демисезон', 'Повседневный', 3, 3, 'По фигуре', 'Короткая', 'Однотонная', 'Верхняя одежда', 4, 5, false, true],
]

for (const [file, custom_name, category, subcategory, color, season, style, warmth, formality, fit, length, pattern, layer_role, comfort, confidence, needs_underlayer, rain_safe] of items) {
  const { data: existing } = await supabase.from('items').select('id').eq('custom_name', custom_name).maybeSingle()
  if (existing) continue
  const path = `demo-extra/${file}`
  const upload = await supabase.storage.from('wardrobe-items').upload(path, await readFile(`public/demo-items/${file}`), { contentType: 'image/png', upsert: true })
  if (upload.error) throw upload.error
  const inserted = await supabase.from('items').insert({
    photo_url: path, custom_name, description: custom_name, category, subcategory, color, season, style,
    warmth, formality, fit, length, pattern, layer_role, comfort, confidence, needs_underlayer, rain_safe,
    availability: 'available', ai_meta: { demo: true, source: 'generated' },
  })
  if (inserted.error) throw inserted.error
}

console.log(`Готово: ${items.length} дополнительных демо-вещей`)
