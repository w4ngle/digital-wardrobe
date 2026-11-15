'use client'

import { useEffect, useState } from 'react'
import { createOutfit, getItems, getOutfits, updateItem } from '@/lib/api'
import { Item, OutfitWithItems } from '@/lib/supabase'
import { OCCASIONS, WEATHER, Occasion, OutfitRecommendation, Weather, recommendOutfits, replaceOutfitItem } from '@/lib/recommendations'
import FastImage from '@/components/FastImage'
import { STYLES } from '@/lib/taxonomy'
import { ArrowsClockwise, Lock, LockOpen, ThumbsDown, ThumbsUp } from '@phosphor-icons/react'

function Choice<T extends string>({ values, value, onChange }: { values: readonly T[], value: T, onChange: (value: T) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
      {values.map((option) => (
        <button type="button" key={option} onClick={() => onChange(option)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${value === option ? 'bg-[#26372f] text-white' : 'border border-[#ddd7cc] bg-white text-[#686258]'}`}>
          {option}
        </button>
      ))}
    </div>
  )
}

export default function RecommendPage() {
  const [items, setItems] = useState<Item[]>([])
  const [ratedOutfits, setRatedOutfits] = useState<OutfitWithItems[]>([])
  const [occasion, setOccasion] = useState<Occasion>('На каждый день')
  const [weather, setWeather] = useState<Weather>('Прохладно')
  const [style, setStyle] = useState<string>('Повседневный')
  const [rain, setRain] = useState(false)
  const [transport, setTransport] = useState<'Пешком' | 'Автобус' | 'Такси'>('Автобус')
  const [requiredItemId, setRequiredItemId] = useState('')
  const [rediscover, setRediscover] = useState(false)
  const [results, setResults] = useState<OutfitRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<number | null>(null)
  const [locked, setLocked] = useState<Record<number, string[]>>({})
  const [rated, setRated] = useState<Record<number, -1 | 1>>({})
  const [dislikeIndex, setDislikeIndex] = useState<number | null>(null)
  const [dislikeReasons, setDislikeReasons] = useState<string[]>([])

  useEffect(() => {
    Promise.all([getItems(), getOutfits()]).then(([loadedItems, loadedOutfits]) => {
      setItems(loadedItems)
      setRatedOutfits(loadedOutfits.filter((outfit) => outfit.rating))
    }).catch(() => alert('Не удалось загрузить гардероб')).finally(() => setLoading(false))
  }, [])

  const preferences = ratedOutfits.reduce<{ itemScores: Record<string, number>, rejectedCombos: string[][] }>((learned, outfit) => {
    if (outfit.rating === 1) outfit.items.forEach((item) => { learned.itemScores[item.id] = (learned.itemScores[item.id] || 0) + 2 })
    if (outfit.rating === -1) learned.rejectedCombos.push(outfit.items.map((item) => item.id))
    return learned
  }, { itemScores: {}, rejectedCombos: [] })

  function handleRecommend() {
    setSaved(null)
    setLocked({})
    setRated({})
    setResults(recommendOutfits(items, { occasion, weather, style, rain, transport, requiredItemId: requiredItemId || undefined, rediscover }, 3, preferences))
  }

  function toggleLock(index: number, itemId: string) {
    setLocked((current) => ({ ...current, [index]: current[index]?.includes(itemId) ? current[index].filter((id) => id !== itemId) : [...(current[index] || []), itemId] }))
  }

  function handleReplace(index: number, itemId: string) {
    if (locked[index]?.includes(itemId)) return
    setResults((current) => current.map((result, resultIndex) => resultIndex === index
      ? replaceOutfitItem(items, result, itemId, { occasion, weather, style, rain, transport, requiredItemId: requiredItemId || undefined, rediscover }, preferences)
      : result))
  }

  function refreshUnlocked(index: number) {
    setResults((current) => current.map((result, resultIndex) => {
      if (resultIndex !== index) return result
      return result.items.reduce((next, item) => locked[index]?.includes(item.id)
        ? next
        : replaceOutfitItem(items, next, item.id, { occasion, weather, style, rain, transport, requiredItemId: requiredItemId || undefined, rediscover }, preferences), result)
    }))
  }

  async function snoozeItem(item: Item) {
    const date = new Date(); date.setDate(date.getDate() + 3)
    try {
      await updateItem(item.id, { snoozed_until: date.toISOString().slice(0, 10) })
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, snoozed_until: date.toISOString().slice(0, 10) } : candidate))
      setResults((current) => current.filter((result) => !result.items.some((candidate) => candidate.id === item.id)))
    } catch { alert('Не удалось отложить вещь') }
  }

  async function handleRate(result: OutfitRecommendation, index: number, rating: -1 | 1, feedbackReasons?: string[]) {
    try {
      const outfit = await createOutfit({ name: `${occasion} · ${style}`, occasion, notes: result.reason, rating, feedback_reasons: feedbackReasons || null }, result.items.map((item) => item.id))
      setRated((current) => ({ ...current, [index]: rating }))
      setRatedOutfits((current) => [...current, outfit])
      setDislikeIndex(null)
      setDislikeReasons([])
    } catch {
      alert('Не удалось сохранить оценку')
    }
  }

  async function handleSave(result: OutfitRecommendation, index: number) {
    try {
      await createOutfit({ name: `${occasion} · ${style}`, occasion, notes: result.reason }, result.items.map((item) => item.id))
      setSaved(index)
    } catch {
      alert('Не удалось сохранить образ')
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f0e6] text-[#1e3026]">
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-7">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#81786d]">Личный стилист</p>
          <h1 className="text-4xl font-bold leading-none tracking-[-0.04em]">Что надеть?</h1>
          <p className="mt-2 text-sm text-[#817b70]">Подберём сочетание по погоде, стилю и поводу</p>
        </header>

        <section className="space-y-5 rounded-[24px] border border-[#dfd4c4] bg-[#fffaf2] p-4 sm:p-6">
          <div><h2 className="mb-3 text-sm font-semibold">Куда</h2><Choice values={OCCASIONS} value={occasion} onChange={setOccasion} /></div>
          <div><h2 className="mb-3 text-sm font-semibold">Погода</h2><Choice values={WEATHER} value={weather} onChange={setWeather} /></div>
          <label className="flex items-center gap-3 rounded-2xl bg-[#f3ede4] p-3 text-sm font-medium"><input type="checkbox" checked={rain} onChange={(event) => setRain(event.target.checked)} className="h-5 w-5" />Ожидается дождь</label>
          <div><h2 className="mb-3 text-sm font-semibold">Как добираемся</h2><Choice values={['Пешком', 'Автобус', 'Такси'] as const} value={transport} onChange={setTransport} /></div>
          <div><h2 className="mb-3 text-sm font-semibold">Настроение</h2><Choice values={STYLES} value={style} onChange={setStyle} /></div>
          <label className="block text-sm font-semibold">Собрать с конкретной вещью<select value={requiredItemId} onChange={(event) => setRequiredItemId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal"><option value="">Не важно</option>{items.filter((item) => !item.availability || item.availability === 'available').map((item) => <option key={item.id} value={item.id}>{item.custom_name || item.description || `${item.subcategory || item.category} · ${item.color}`}</option>)}</select></label>
          <label className="flex items-center gap-3 rounded-2xl bg-[#f3ede4] p-3 text-sm font-medium"><input type="checkbox" checked={rediscover} onChange={(event) => setRediscover(event.target.checked)} className="h-5 w-5" />Добавить вещи, которые давно не носились</label>
          <button type="button" disabled={loading || items.length < 2} onClick={handleRecommend} className="w-full rounded-full bg-[#1f422f] px-4 py-3.5 font-semibold text-white disabled:opacity-35">
            {loading ? 'Загружаем гардероб…' : 'Показать варианты'}
          </button>
        </section>

        {!results.length && !loading && (
          <div className="mt-6 rounded-[20px] border border-[#ded8cd] px-5 py-8 text-center text-sm text-[#817b70]">
            {items.length < 2 ? 'Добавьте хотя бы две вещи в гардероб' : 'Выберите параметры — мы предложим до трёх вариантов'}
          </div>
        )}

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {results.map((result, index) => (
            <article key={result.items.map((item) => item.id).join(':')} className="overflow-hidden rounded-[24px] bg-[#faf8f4] shadow-[0_8px_24px_rgba(41,37,31,0.07)]">
              <div className="grid grid-cols-2 gap-px bg-[#e8e2d8]">
                {result.items.map((item) => {
                  const isLocked = locked[index]?.includes(item.id)
                  return <div key={item.id} className="relative aspect-square overflow-hidden bg-[#ece7de]">
                    {item.photo_url && <FastImage src={item.photo_url} alt={item.description || item.category} className="h-full w-full object-cover" />}
                    <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 rounded-full bg-white/90 p-1 pl-2 shadow-sm backdrop-blur">
                      <span className="truncate text-[9px] font-semibold">{item.category}</span>
                      <div className="flex shrink-0">
                        <button type="button" onClick={() => handleReplace(index, item.id)} disabled={isLocked} className="p-1 disabled:opacity-30" aria-label="Заменить вещь"><ArrowsClockwise size={15} /></button>
                        <button type="button" onClick={() => snoozeItem(item)} className="p-1 text-[#8a645a]" aria-label="Не предлагать вещь три дня">×</button>
                        <button type="button" onClick={() => toggleLock(index, item.id)} className="p-1" aria-label={isLocked ? 'Открепить вещь' : 'Закрепить вещь'}>{isLocked ? <Lock size={15} weight="fill" /> : <LockOpen size={15} />}</button>
                      </div>
                    </div>
                  </div>
                })}
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#65786d]">Вариант {index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-[#686258]">{result.reason}</p>
                <button type="button" onClick={() => refreshUnlocked(index)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d8d1c6] bg-white px-4 py-3 text-sm font-semibold text-[#3f4f46]"><ArrowsClockwise size={17} />Обновить незакреплённые</button>
                <button type="button" onClick={() => handleSave(result, index)} disabled={saved === index} className="mt-2 w-full rounded-xl bg-[#ece7dd] px-4 py-3 text-sm font-semibold text-[#3f4f46] disabled:bg-[#dfe9e2]">
                  {saved === index ? '✓ Сохранено' : 'Сохранить образ'}
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleRate(result, index, 1)} disabled={Boolean(rated[index])} className="flex items-center justify-center gap-2 rounded-xl border border-[#cfd9d2] px-3 py-2 text-xs font-semibold disabled:bg-[#dfe9e2]"><ThumbsUp size={16} />{rated[index] === 1 ? 'Учтено' : 'Нравится'}</button>
                  <button type="button" onClick={() => { setDislikeIndex(index); setDislikeReasons([]) }} disabled={Boolean(rated[index])} className="flex items-center justify-center gap-2 rounded-xl border border-[#e0d0ce] px-3 py-2 text-xs font-semibold disabled:bg-[#efe3e1]"><ThumbsDown size={16} />{rated[index] === -1 ? 'Учтено' : 'Не моё'}</button>
                </div>
                {dislikeIndex === index && <div className="mt-3 rounded-2xl bg-[#f3ede4] p-3"><p className="mb-2 text-xs font-semibold">Что не подошло?</p><div className="flex flex-wrap gap-2">{['Не нравится сочетание', 'Не по погоде', 'Не по случаю', 'Неудобно', 'Не хочу эту вещь сегодня'].map((reason) => <button type="button" key={reason} onClick={() => setDislikeReasons((current) => current.includes(reason) ? current.filter((value) => value !== reason) : [...current, reason])} className={`rounded-full px-3 py-2 text-[11px] ${dislikeReasons.includes(reason) ? 'bg-[#6f1820] text-white' : 'bg-white text-[#686258]'}`}>{reason}</button>)}</div><button type="button" onClick={() => handleRate(result, index, -1, dislikeReasons)} disabled={!dislikeReasons.length} className="mt-3 w-full rounded-xl bg-[#6f1820] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Запомнить</button></div>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
