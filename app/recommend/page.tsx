'use client'

import { useEffect, useState } from 'react'
import { createOutfit, getItems } from '@/lib/api'
import { Item } from '@/lib/supabase'
import {
  OCCASIONS,
  WEATHER,
  Occasion,
  OutfitRecommendation,
  Weather,
  recommendOutfits,
} from '@/lib/recommendations'
import { STYLES } from '@/lib/taxonomy'

function Choice<T extends string>({ values, value, onChange }: {
  values: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((option) => (
        <button
          type="button"
          key={option}
          onClick={() => onChange(option)}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            value === option ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-muted'
          }`}
        >
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
    getItems()
      .then(setItems)
      .catch(() => alert('Не удалось загрузить гардероб'))
      .finally(() => setLoading(false))
  }, [])

  const handleRecommend = () => {
    setSaved(null)
    setResults(recommendOutfits(items, { occasion, weather, style }))
  }

  const handleSave = async (result: OutfitRecommendation, index: number) => {
    try {
      await createOutfit({
        name: `${occasion} · ${style}`,
        occasion,
        notes: result.reason,
      }, result.items.map((item) => item.id))
      setSaved(index)
    } catch {
      alert('Не удалось сохранить образ')
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-28 pt-[max(24px,env(safe-area-inset-top))]">
      <header className="mb-6">
        <p className="mb-1 text-sm text-muted">Подбор без ИИ</p>
        <h1 className="text-3xl font-bold">Что надеть?</h1>
      </header>

      <section className="space-y-6 rounded-card border border-line bg-surface p-4">
        <div>
          <h2 className="mb-3 font-medium">Куда</h2>
          <Choice values={OCCASIONS} value={occasion} onChange={setOccasion} />
        </div>
        <div>
          <h2 className="mb-3 font-medium">Погода</h2>
          <Choice values={WEATHER} value={weather} onChange={setWeather} />
        </div>
        <div>
          <h2 className="mb-3 font-medium">Стиль</h2>
          <Choice values={STYLES} value={style} onChange={setStyle} />
        </div>
        <button
          type="button"
          disabled={loading || items.length < 2}
          onClick={handleRecommend}
          className="w-full rounded-xl bg-accent px-4 py-3.5 font-semibold text-white disabled:opacity-40"
        >
          {loading ? 'Загружаю гардероб…' : 'Подобрать образ'}
        </button>
        {!loading && items.length < 2 && (
          <p className="text-center text-sm text-muted">Добавьте хотя бы две вещи в гардероб.</p>
        )}
      </section>

      {results.length === 0 && !loading && items.length >= 2 && (
        <p className="mt-6 text-center text-sm text-muted">Выберите параметры и нажмите «Подобрать образ».</p>
      )}

      <div className="mt-6 space-y-5">
        {results.map((result, index) => (
          <article key={result.items.map((item) => item.id).join(':')} className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="grid grid-cols-2 gap-px bg-line">
              {result.items.map((item) => (
                <div key={item.id} className="bg-surface-2">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={`${item.category}, ${item.color}`} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-sm text-muted">{item.category}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4">
              <h2 className="font-semibold">Вариант {index + 1}</h2>
              <p className="mt-1 text-sm leading-5 text-muted">{result.reason}</p>
              <button
                type="button"
                onClick={() => handleSave(result, index)}
                disabled={saved === index}
                className="mt-4 w-full rounded-xl bg-surface-2 px-4 py-3 font-medium text-fg disabled:text-ok"
              >
                {saved === index ? 'Сохранено' : 'Сохранить образ'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
