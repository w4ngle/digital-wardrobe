import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase admin credentials are missing')

const supabase = createClient(url, key, { auth: { persistSession: false } })
const apply = process.argv.includes('--apply')

const cleanName = (item) => (item.custom_name || item.description || item.subcategory || item.category)
  .replace(/\s*[·-]\s*вариант\s*\d+$/iu, '').trim()
const photoKey = (item) => item.photo_url?.split('?')[0] || ''
const normalize = (value) => String(value || '').toLowerCase().replace(/ё/g, 'е')

function inferredSubcategory(item) {
  if (item.subcategory) return item.subcategory
  const text = normalize(`${item.custom_name} ${item.description}`)
  const matches = [
    ['рубаш', 'Рубашка'], ['блуз', 'Блузка'], ['футбол', 'Футболка'], ['свитер', 'Свитер'],
    ['кардиган', 'Кардиган'], ['худи', 'Худи'], ['джинс', item.category === 'Низ' ? 'Джинсы' : 'Джинсовка'],
    ['брюк', 'Брюки'], ['юбк', 'Юбка'], ['шорт', 'Шорты'], ['плать', 'Платье'],
    ['кроссов', 'Кроссовки'], ['ботин', 'Ботинки'], ['сапог', 'Сапоги'], ['туфл', 'Туфли'],
    ['пальто', 'Пальто'], ['пухов', 'Пуховик'], ['куртк', 'Куртка'], ['плащ', 'Плащ'],
    ['сумк', 'Сумка'], ['купаль', 'Купальник'], ['шарф', 'Шарф'], ['ремень', 'Ремень'],
  ]
  return matches.find(([word]) => text.includes(word))?.[1] || item.category
}

function enriched(item) {
  const text = normalize(`${item.custom_name} ${item.description} ${item.subcategory}`)
  const supportsFit = ['Верх', 'Низ', 'Платье', 'Комплект', 'Купальник', 'Верхняя одежда', 'Домашняя одежда'].includes(item.category)
  const layerRole = item.layer_role || (item.category === 'Верхняя одежда'
    ? 'Верхняя одежда'
    : item.category === 'Верх' ? (/свитер|кофт|кардиган|худи|зип/.test(text) ? 'Второй слой' : 'Базовый слой') : 'Самостоятельная вещь')
  const warmth = item.warmth || (item.season === 'Лето' ? 1 : item.season === 'Зима' ? 5 : 3)
  const trainingSuitable = item.style === 'Спортивный' || /спорт|трениров|волейбол|леггинс|кроссов/.test(text)
  return {
    custom_name: cleanName(item),
    subcategory: inferredSubcategory(item),
    warmth,
    comfort: item.comfort || 3,
    confidence: item.confidence || 3,
    fit: supportsFit ? item.fit || 'Обычная' : null,
    pattern: item.pattern || 'Однотонная',
    layer_role: layerRole,
    ai_meta: { ...(item.ai_meta || {}), demo: true, training_suitable: trainingSuitable },
  }
}

function remapIds(ids, replacements) {
  return [...new Set((ids || []).map((id) => replacements.get(id) || id))]
}

function remapDetails(details, replacements) {
  if (!details || !Array.isArray(details.outfitItemIds)) return details
  return { ...details, outfitItemIds: details.outfitItemIds.map((ids) => remapIds(ids, replacements)) }
}

const { data: allItems, error: itemError } = await supabase.from('items').select('*').order('created_at')
if (itemError) throw itemError
const demoItems = allItems.filter((item) => item.ai_meta?.demo === true)
const groups = new Map()
for (const item of demoItems) {
  const key = photoKey(item) || `${item.category}|${item.subcategory || ''}|${normalize(cleanName(item))}`
  groups.set(key, [...(groups.get(key) || []), item])
}

const replacements = new Map()
const keepers = []
for (const group of groups.values()) {
  const sorted = [...group].sort((a, b) => {
    const aVariant = a.ai_meta?.source === 'demo-variant' ? 1 : 0
    const bVariant = b.ai_meta?.source === 'demo-variant' ? 1 : 0
    return aVariant - bVariant || new Date(a.created_at) - new Date(b.created_at)
  })
  keepers.push(sorted[0])
  sorted.slice(1).forEach((item) => replacements.set(item.id, sorted[0].id))
}

console.log(JSON.stringify({ demoItems: demoItems.length, uniqueDemoItems: keepers.length, duplicatesToRemove: replacements.size, apply }, null, 2))
if (!apply) process.exit(0)

for (const item of keepers) {
  const { error } = await supabase.from('items').update(enriched(item)).eq('id', item.id)
  if (error) throw error
}

const duplicateIds = [...replacements.keys()]
if (duplicateIds.length > 0) {
  const [{ data: links, error: linksError }, { data: history, error: historyError }, { data: sessions, error: sessionsError }, { data: trips, error: tripsError }] = await Promise.all([
    supabase.from('outfit_items').select('id,outfit_id,item_id').in('item_id', duplicateIds),
    supabase.from('wear_history').select('id,item_id').in('item_id', duplicateIds),
    supabase.from('telegram_widget_sessions').select('id,item_ids'),
    supabase.from('trips').select('id,packed_item_ids,details'),
  ])
  if (linksError) throw linksError
  if (historyError) throw historyError
  if (sessionsError) throw sessionsError
  if (tripsError) throw tripsError

  for (const link of links || []) {
    const canonicalId = replacements.get(link.item_id)
    const { data: existing, error: existingError } = await supabase.from('outfit_items').select('id').eq('outfit_id', link.outfit_id).eq('item_id', canonicalId).maybeSingle()
    if (existingError) throw existingError
    if (!existing) {
      const { error } = await supabase.from('outfit_items').update({ item_id: canonicalId }).eq('id', link.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('outfit_items').delete().eq('id', link.id)
      if (error) throw error
    }
  }
  for (const record of history || []) {
    const { error } = await supabase.from('wear_history').update({ item_id: replacements.get(record.item_id) }).eq('id', record.id)
    if (error) throw error
  }
  for (const session of sessions || []) {
    const itemIds = remapIds(session.item_ids, replacements)
    if (itemIds.join(':') !== (session.item_ids || []).join(':')) {
      const { error } = await supabase.from('telegram_widget_sessions').update({ item_ids: itemIds }).eq('id', session.id)
      if (error) throw error
    }
  }
  for (const trip of trips || []) {
    const packed = remapIds(trip.packed_item_ids, replacements)
    const details = remapDetails(trip.details, replacements)
    if (packed.join(':') !== (trip.packed_item_ids || []).join(':') || JSON.stringify(details) !== JSON.stringify(trip.details)) {
      const { error } = await supabase.from('trips').update({ packed_item_ids: packed, details }).eq('id', trip.id)
      if (error) throw error
    }
  }
  for (let index = 0; index < duplicateIds.length; index += 50) {
    const { error } = await supabase.from('items').delete().in('id', duplicateIds.slice(index, index + 50))
    if (error) throw error
  }
}

console.log('Demo wardrobe cleanup completed')
