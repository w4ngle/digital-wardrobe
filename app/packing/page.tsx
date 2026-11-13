'use client'

import { useEffect, useState } from 'react'
import { getItems } from '@/lib/api'
import { Item } from '@/lib/supabase'
import { buildPackingList, WEATHER, Weather } from '@/lib/recommendations'
import { STYLES } from '@/lib/taxonomy'

export default function PackingPage() {
  const [items, setItems] = useState<Item[]>([])
  const [days, setDays] = useState(3)
  const [weather, setWeather] = useState<Weather>('Прохладно')
  const [style, setStyle] = useState<string>('Повседневный')
  const [packing, setPacking] = useState<Item[]>([])

  useEffect(() => { getItems().then(setItems).catch(() => alert('Не удалось загрузить гардероб')) }, [])

  function build() {
    setPacking(buildPackingList(items, { occasion: 'На каждый день', weather, style }, days))
  }

  return <main className="min-h-screen bg-[#f6f0e6] text-[#1e3026]">
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
      <header className="mb-7"><p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#81786d]">В поездку</p><h1 className="text-4xl font-bold tracking-[-0.04em]">Собрать чемодан</h1><p className="mt-2 text-sm text-[#817b70]">Только доступные вещи, которые сочетаются между собой</p></header>
      <section className="space-y-4 rounded-[24px] border border-[#dfd4c4] bg-[#fffaf2] p-4">
        <label className="block text-sm font-semibold">На сколько дней<input type="number" min="2" max="14" value={days || ''} onChange={(event) => setDays(Math.min(14, Math.max(0, Number(event.target.value))))} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Погода<select value={weather} onChange={(event) => setWeather(event.target.value as Weather)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{WEATHER.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="block text-sm font-semibold">Стиль<select value={style} onChange={(event) => setStyle(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{STYLES.map((option) => <option key={option}>{option}</option>)}</select></label>
        <button type="button" onClick={build} disabled={days < 2 || items.length < 2} className="w-full rounded-full bg-[#1f422f] px-4 py-3.5 font-semibold text-white disabled:opacity-35">Собрать список</button>
      </section>
      {packing.length > 0 && <section className="mt-7"><div className="mb-3 flex items-end justify-between"><h2 className="text-xl font-bold">Взять с собой</h2><span className="text-xs text-[#817b70]">{packing.length} вещей</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{packing.map((item) => <article key={item.id} className="overflow-hidden rounded-[20px] bg-[#faf8f4]">{item.photo_url && <img src={item.photo_url} alt={item.description || item.category} className="aspect-square w-full object-cover" />}<div className="p-3"><p className="truncate text-sm font-semibold">{item.description || item.category}</p><p className="mt-1 text-xs text-[#817b70]">{item.category} · {item.color}</p></div></article>)}</div></section>}
    </div>
  </main>
}
