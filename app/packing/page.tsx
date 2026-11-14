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
  const [tripType, setTripType] = useState('Море')
  const [city, setCity] = useState('')
  const [evenings, setEvenings] = useState(0)
  const [beach, setBeach] = useState(true)
  const [training, setTraining] = useState(false)
  const [laundry, setLaundry] = useState(false)
  const [baggage, setBaggage] = useState('Чемодан')
  const [packing, setPacking] = useState<Item[]>([])
  const [packedIds, setPackedIds] = useState<string[]>([])
  const [checkedExtras, setCheckedExtras] = useState<string[]>([])

  useEffect(() => { getItems().then(setItems).catch(() => alert('Не удалось загрузить гардероб')) }, [])

  function build() {
    const occasion = training ? 'Тренировка' : beach ? 'Пляж / бассейн' : evenings > 0 ? 'Праздник / на выход' : 'Поездка'
    setPacking(buildPackingList(items, { occasion, weather, style }, Math.max(days, evenings)))
    setPackedIds([])
    setCheckedExtras([])
  }

  function togglePacked(id: string) {
    setPackedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id])
  }

  return <main className="min-h-screen bg-[#f6f0e6] text-[#1e3026]">
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
      <header className="mb-7"><p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#81786d]">В поездку</p><h1 className="text-4xl font-bold tracking-[-0.04em]">Собрать чемодан</h1><p className="mt-2 text-sm text-[#817b70]">Только доступные вещи, которые сочетаются между собой</p></header>
      <section className="space-y-4 rounded-[24px] border border-[#dfd4c4] bg-[#fffaf2] p-4">
        <label className="block text-sm font-semibold">Тип поездки<select value={tripType} onChange={(event) => setTripType(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{['Море', 'Горы', 'Соревнования', 'Сборы', 'Короткая поездка'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="block text-sm font-semibold">Город<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Куда едем" className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label>
        <label className="block text-sm font-semibold">На сколько дней<input type="number" min="1" max="30" required value={Number.isNaN(days) ? '' : days} onChange={(event) => setDays(event.target.value === '' ? Number.NaN : event.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Вечерних выходов<input type="number" min="0" max="14" value={Number.isNaN(evenings) ? '' : evenings} onChange={(event) => setEvenings(event.target.value === '' ? Number.NaN : event.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Погода<select value={weather} onChange={(event) => setWeather(event.target.value as Weather)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{WEATHER.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="block text-sm font-semibold">Стиль<select value={style} onChange={(event) => setStyle(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{STYLES.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="block text-sm font-semibold">Багаж<select value={baggage} onChange={(event) => setBaggage(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{['Ручная кладь', 'Чемодан', 'Без ограничений / поезд'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <div className="space-y-2 rounded-2xl bg-[#f3ede4] p-4">{[[beach, setBeach, 'Будет пляж или бассейн'], [training, setTraining, 'Будут тренировки'], [laundry, setLaundry, 'Будет стиральная машина']] .map(([checked, setter, label]) => <label key={String(label)} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={checked as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="h-5 w-5" />{label as string}</label>)}</div>
        <button type="button" onClick={build} disabled={!days || days < 1 || items.length < 2} className="w-full rounded-full bg-[#1f422f] px-4 py-3.5 font-semibold text-white disabled:opacity-35">Собрать список</button>
      </section>
      {packing.length > 0 && <><section className="mt-7"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-bold">Взять с собой</h2><p className="mt-1 text-xs text-[#817b70]">{city || tripType} · {days} дн. · {baggage}{laundry ? ' · со стиркой' : ''}</p></div><span className="text-xs text-[#817b70]">Собрано {packedIds.length} из {packing.length}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{packing.map((item) => { const packed = packedIds.includes(item.id); return <button type="button" key={item.id} onClick={() => togglePacked(item.id)} aria-pressed={packed} className={`relative overflow-hidden rounded-[20px] bg-[#faf8f4] text-left transition ${packed ? 'opacity-55' : ''}`}>{item.photo_url && <img src={item.photo_url} alt={item.description || item.category} className="aspect-square w-full object-cover" />}<span className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold ${packed ? 'border-[#1f422f] bg-[#1f422f] text-white' : 'border-white bg-white/80 text-transparent'}`}>✓</span><span className="block p-3"><span className={`block truncate text-sm font-semibold ${packed ? 'line-through' : ''}`}>{item.custom_name || item.description || item.subcategory || item.category}</span><span className="mt-1 block text-xs text-[#817b70]">{item.category} · {item.color}</span></span></button> })}</div></section><section className="mt-7 rounded-[24px] bg-[#fffaf2] p-4"><h2 className="mb-3 text-xl font-bold">Не забыть</h2><div className="space-y-2">{['Бельё и носки', 'Документы и деньги', 'Зарядки', 'Косметика и уход', 'Лекарства', ...(beach ? ['Запасной купальник', 'Пляжная сумка'] : []), ...(training ? ['Форма для тренировок'] : [])].map((entry) => <label key={entry} className={`flex items-center gap-3 rounded-xl p-3 text-sm ${checkedExtras.includes(entry) ? 'bg-[#e5ece7] line-through' : 'bg-[#f3ede4]'}`}><input type="checkbox" checked={checkedExtras.includes(entry)} onChange={() => setCheckedExtras((current) => current.includes(entry) ? current.filter((value) => value !== entry) : [...current, entry])} className="h-5 w-5" />{entry}</label>)}</div></section></>}
    </div>
  </main>
}
