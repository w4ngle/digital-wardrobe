'use client'

import { useEffect, useState } from 'react'
import { createOutfit, getItems } from '@/lib/api'
import { Item } from '@/lib/supabase'
import { OCCASIONS, WEATHER, Occasion, OutfitRecommendation, Weather, recommendOutfits } from '@/lib/recommendations'
import { STYLES } from '@/lib/taxonomy'
import OutfitCollage from '@/components/OutfitCollage'

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
  const [occasion, setOccasion] = useState<Occasion>('На каждый день')
  const [weather, setWeather] = useState<Weather>('Прохладно')
  const [style, setStyle] = useState<string>('Повседневный')
  const [results, setResults] = useState<OutfitRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<number | null>(null)

  useEffect(() => {
    getItems().then(setItems).catch(() => alert('Не удалось загрузить гардероб')).finally(() => setLoading(false))
  }, [])

  function handleRecommend() {
    setSaved(null)
    setResults(recommendOutfits(items, { occasion, weather, style }))
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
          <div><h2 className="mb-3 text-sm font-semibold">Настроение</h2><Choice values={STYLES} value={style} onChange={setStyle} /></div>
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
              <OutfitCollage items={result.items} />
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#65786d]">Вариант {index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-[#686258]">{result.reason}</p>
                <button type="button" onClick={() => handleSave(result, index)} disabled={saved === index} className="mt-4 w-full rounded-xl bg-[#ece7dd] px-4 py-3 text-sm font-semibold text-[#3f4f46] disabled:bg-[#dfe9e2]">
                  {saved === index ? '✓ Сохранено' : 'Сохранить образ'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
