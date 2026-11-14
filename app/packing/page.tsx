'use client'

import { useEffect, useState } from 'react'
import { createTrip, getItems, getTrips, updateTrip } from '@/lib/api'
import { Item, Trip } from '@/lib/supabase'
import { buildPackingList, OutfitRecommendation, recommendOutfits, WEATHER, Weather } from '@/lib/recommendations'
import { STYLES } from '@/lib/taxonomy'

export default function PackingPage() {
  const [items, setItems] = useState<Item[]>([])
  const [days, setDays] = useState(3)
  const [weather, setWeather] = useState<Weather>('Прохладно')
  const [style, setStyle] = useState<string>('Повседневный')
  const [tripType, setTripType] = useState('Море')
  const [city, setCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [forecast, setForecast] = useState('')
  const [evenings, setEvenings] = useState(0)
  const [beach, setBeach] = useState(true)
  const [training, setTraining] = useState(false)
  const [laundry, setLaundry] = useState(false)
  const [baggage, setBaggage] = useState('Чемодан')
  const [packing, setPacking] = useState<Item[]>([])
  const [packingOutfits, setPackingOutfits] = useState<OutfitRecommendation[]>([])
  const [packedIds, setPackedIds] = useState<string[]>([])
  const [checkedExtras, setCheckedExtras] = useState<string[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [saving, setSaving] = useState(false)
  const [currentTripId, setCurrentTripId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [usedIds, setUsedIds] = useState<string[]>([])
  const [openedOutfit, setOpenedOutfit] = useState<OutfitRecommendation | null>(null)

  useEffect(() => { Promise.all([getItems(), getTrips()]).then(([loadedItems, loadedTrips]) => { setItems(loadedItems); setTrips(loadedTrips) }).catch(() => alert('Не удалось загрузить гардероб')) }, [])

  const extraEntries = ['Бельё и носки', 'Документы и деньги', 'Зарядки', 'Косметика и уход', 'Лекарства', ...(beach ? ['Запасной купальник', 'Пляжная сумка'] : []), ...(training ? ['Форма для тренировок'] : [])]

  async function build() {
    let tripWeather = weather
    setForecast('')
    if (city && startDate && endDate) {
      try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru`).then((response) => response.json())
        const place = geo.results?.[0]
        if (place) {
          const data = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`).then((response) => response.json())
          const max = Math.round(Math.max(...data.daily.temperature_2m_max)); const min = Math.round(Math.min(...data.daily.temperature_2m_min)); const rainChance = Math.max(...data.daily.precipitation_probability_max)
          setForecast(`${min}…${max}°, вероятность дождя до ${rainChance}%`)
          const average = (min + max) / 2; tripWeather = average >= 20 ? 'Тепло' : average <= 5 ? 'Холодно' : 'Прохладно'; setWeather(tripWeather)
        }
      } catch { setForecast('Прогноз на эти даты пока недоступен') }
    }
    const selected = new Map<string, Item>()
    const add = (list: Item[]) => list.forEach((item) => selected.set(item.id, item))
    const everydayOutfits = recommendOutfits(items, { occasion: 'Поездка', weather: tripWeather, style }, Math.min(days, 14))
    const eveningOutfits = evenings > 0 ? recommendOutfits(items, { occasion: 'Праздник / на выход', weather: tripWeather, style: 'Нарядный' }, evenings) : []
    add(everydayOutfits.flatMap((outfit) => outfit.items))
    add(eveningOutfits.flatMap((outfit) => outfit.items))
    if (beach) add(buildPackingList(items, { occasion: 'Пляж / бассейн', weather: tripWeather, style: 'Отпускной' }, 2))
    if (training) add(buildPackingList(items, { occasion: 'Тренировка', weather: tripWeather, style: 'Спортивный' }, Math.min(days, 5)))
    const available = items.filter((item) => !item.availability || item.availability === 'available')
    const addCategory = (category: string, count: number, predicate: (item: Item) => boolean = () => true) => add(available.filter((item) => item.category === category && predicate(item)).slice(0, count))
    addCategory('Верх', Math.max(2, Math.ceil(days / (laundry ? 3 : 2))), (item) => item.layer_role !== 'Второй слой')
    addCategory('Низ', Math.max(2, Math.ceil(days / 3)))
    addCategory('Обувь', baggage === 'Ручная кладь' ? 1 : 2)
    if (tripWeather !== 'Тепло') addCategory('Верхняя одежда', 1)
    if (beach) { addCategory('Купальник', 2); addCategory('Сумка', 1, (item) => item.subcategory === 'Пляжная сумка') }
    if (evenings) { addCategory('Платье', Math.min(evenings, Math.max(1, Math.ceil(evenings / 2)))); addCategory('Сумка', 1) }
    addCategory('Домашняя одежда', 1)
    setPacking([...selected.values()])
    setPackingOutfits([...everydayOutfits, ...eveningOutfits])
    setPackedIds([])
    setCheckedExtras([])
  }

  function togglePacked(id: string) {
    setPackedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id])
  }

  async function saveTrip() {
    setSaving(true)
    try {
      const trip = await createTrip({ name: city || tripType, details: { tripType, city, startDate, endDate, days, weather, style, evenings, beach, training, laundry, baggage, outfitItemIds: packingOutfits.map((outfit) => outfit.items.map((item) => item.id)) }, packed_item_ids: packing.map((item) => item.id), checklist: extraEntries.map((label) => ({ label, checked: checkedExtras.includes(label) })) })
      setTrips((current) => [trip, ...current])
      setCurrentTripId(trip.id)
    } catch { alert('Не удалось сохранить поездку') } finally { setSaving(false) }
  }

  function loadTrip(trip: Trip) {
    const details = trip.details
    setTripType(String(details.tripType || 'Поездка')); setCity(String(details.city || trip.name)); setStartDate(String(details.startDate || '')); setEndDate(String(details.endDate || '')); setDays(Number(details.days || 3)); setWeather((details.weather || 'Прохладно') as Weather); setStyle(String(details.style || 'Повседневный')); setEvenings(Number(details.evenings || 0)); setBeach(Boolean(details.beach)); setTraining(Boolean(details.training)); setLaundry(Boolean(details.laundry)); setBaggage(String(details.baggage || 'Чемодан'))
    setPacking(items.filter((item) => trip.packed_item_ids.includes(item.id))); setCheckedExtras(trip.checklist.filter((entry) => entry.checked).map((entry) => entry.label)); setPackedIds([])
    const outfitIds = Array.isArray(details.outfitItemIds) ? details.outfitItemIds as string[][] : []
    setPackingOutfits(outfitIds.map((ids) => ({ items: ids.map((id) => items.find((item) => item.id === id)).filter((item): item is Item => Boolean(item)), reason: '', score: 0 })).filter((outfit) => outfit.items.length))
    setCurrentTripId(trip.id); setReviewing(false); setUsedIds(Array.isArray(details.usedItemIds) ? details.usedItemIds as string[] : [])
  }

  async function saveReview() {
    if (!currentTripId) return
    setSaving(true)
    try {
      const current = trips.find((trip) => trip.id === currentTripId)
      const updated = await updateTrip(currentTripId, { ...(current?.details || {}), reviewedAt: new Date().toISOString(), usedItemIds: usedIds })
      setTrips((all) => all.map((trip) => trip.id === updated.id ? updated : trip)); setReviewing(false)
    } catch { alert('Не удалось сохранить итоги поездки') } finally { setSaving(false) }
  }

  return <main className="min-h-screen bg-[#f6f0e6] text-[#1e3026]">
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
      <header className="mb-7"><p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#81786d]">В поездку</p><h1 className="text-4xl font-bold tracking-[-0.04em]">Собрать чемодан</h1><p className="mt-2 text-sm text-[#817b70]">Только доступные вещи, которые сочетаются между собой</p></header>
      {trips.length > 0 && <section className="mb-5"><h2 className="mb-2 text-sm font-semibold">Сохранённые поездки</h2><div className="flex gap-2 overflow-x-auto pb-1">{trips.map((trip) => <button type="button" key={trip.id} onClick={() => loadTrip(trip)} className="shrink-0 rounded-full border border-[#ddd7cc] bg-white px-4 py-2 text-xs">{trip.name}</button>)}</div></section>}
      <section className="space-y-4 rounded-[24px] border border-[#dfd4c4] bg-[#fffaf2] p-4">
        <label className="block text-sm font-semibold">Тип поездки<select value={tripType} onChange={(event) => setTripType(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{['Море', 'Горы', 'Соревнования', 'Сборы', 'Короткая поездка'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="block text-sm font-semibold">Город<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Куда едем" className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block min-w-0 text-sm font-semibold">С<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 block w-full min-w-0 rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label><label className="block min-w-0 text-sm font-semibold">По<input type="date" value={endDate} min={startDate} onChange={(event) => { setEndDate(event.target.value); if (startDate && event.target.value) setDays(Math.max(1, Math.round((new Date(event.target.value).getTime() - new Date(startDate).getTime()) / 86400000) + 1)) }} className="mt-2 block w-full min-w-0 rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label></div>
        <label className="block text-sm font-semibold">На сколько дней<input type="number" min="1" max="30" required value={Number.isNaN(days) ? '' : days} onChange={(event) => setDays(event.target.value === '' ? Number.NaN : event.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Вечерних выходов<input type="number" min="0" max="14" value={Number.isNaN(evenings) ? '' : evenings} onChange={(event) => setEvenings(event.target.value === '' ? Number.NaN : event.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Погода<select value={weather} onChange={(event) => setWeather(event.target.value as Weather)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{WEATHER.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="block text-sm font-semibold">Стиль<select value={style} onChange={(event) => setStyle(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{STYLES.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="block text-sm font-semibold">Багаж<select value={baggage} onChange={(event) => setBaggage(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{['Ручная кладь', 'Чемодан', 'Без ограничений / поезд'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <div className="space-y-2 rounded-2xl bg-[#f3ede4] p-4">{[[beach, setBeach, 'Будет пляж или бассейн'], [training, setTraining, 'Будут тренировки'], [laundry, setLaundry, 'Будет стиральная машина']] .map(([checked, setter, label]) => <label key={String(label)} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={checked as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="h-5 w-5" />{label as string}</label>)}</div>
        <button type="button" onClick={build} disabled={!days || days < 1 || items.length < 2} className="w-full rounded-full bg-[#1f422f] px-4 py-3.5 font-semibold text-white disabled:opacity-35">Собрать список</button>
        {forecast && <p className="rounded-xl bg-[#e5ece7] px-3 py-2 text-xs">Прогноз: {forecast}{forecast.includes('недоступен') ? ' — выберите погоду вручную выше' : ''}</p>}
      </section>
      {packing.length > 0 && <><section className="mt-7"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-bold">Взять с собой</h2><p className="mt-1 text-xs text-[#817b70]">{city || tripType} · {days} дн. · {baggage}{laundry ? ' · со стиркой' : ''}</p></div><span className="text-xs text-[#817b70]">Собрано {packedIds.length} из {packing.length}</span></div>{packingOutfits.length > 0 && <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{packingOutfits.map((outfit, index) => <button type="button" onClick={() => setOpenedOutfit(outfit)} key={outfit.items.map((item) => item.id).join(':')} className="w-44 shrink-0 rounded-2xl bg-white p-3 text-left"><p className="text-xs font-bold">Образ {index + 1}</p><p className="mt-1 line-clamp-3 text-[11px] text-[#817b70]">{outfit.items.map((item) => item.custom_name || item.subcategory || item.category).join(' + ')}</p></button>)}</div>}<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{packing.map((item) => { const packed = packedIds.includes(item.id); return <button type="button" key={item.id} onClick={() => reviewing ? setUsedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]) : togglePacked(item.id)} aria-pressed={reviewing ? usedIds.includes(item.id) : packed} className={`relative overflow-hidden rounded-[20px] bg-[#faf8f4] text-left transition ${(reviewing ? usedIds.includes(item.id) : packed) ? 'opacity-55' : ''}`}>{item.photo_url && <img src={item.photo_url} alt={item.description || item.category} className="aspect-square w-full object-cover" />}<span className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold ${(reviewing ? usedIds.includes(item.id) : packed) ? 'border-[#1f422f] bg-[#1f422f] text-white' : 'border-white bg-white/80 text-transparent'}`}>✓</span><span className="block p-3"><span className={`block truncate text-sm font-semibold ${packed && !reviewing ? 'line-through' : ''}`}>{item.custom_name || item.description || item.subcategory || item.category}</span><span className="mt-1 block text-xs text-[#817b70]">{item.category} · {item.color}</span></span></button> })}</div></section><section className="mt-7 rounded-[24px] bg-[#fffaf2] p-4"><h2 className="mb-3 text-xl font-bold">Не забыть</h2><div className="space-y-2">{extraEntries.map((entry) => <label key={entry} className={`flex items-center gap-3 rounded-xl p-3 text-sm ${checkedExtras.includes(entry) ? 'bg-[#e5ece7] line-through' : 'bg-[#f3ede4]'}`}><input type="checkbox" checked={checkedExtras.includes(entry)} onChange={() => setCheckedExtras((current) => current.includes(entry) ? current.filter((value) => value !== entry) : [...current, entry])} className="h-5 w-5" />{entry}</label>)}</div><button type="button" onClick={saveTrip} disabled={saving} className="mt-4 w-full rounded-full bg-[#1f422f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{saving ? 'Сохраняю…' : 'Сохранить поездку'}</button>{currentTripId && <button type="button" onClick={() => reviewing ? saveReview() : setReviewing(true)} disabled={saving} className="mt-2 w-full rounded-full border border-[#1f422f] px-4 py-3 text-sm font-semibold">{reviewing ? `Сохранить: использовано ${usedIds.length}` : 'После поездки: что пригодилось?'}</button>}</section></>}
      {openedOutfit && <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-3 sm:items-center sm:justify-center" onClick={() => setOpenedOutfit(null)}><section className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-[#fffaf2] p-5" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Образ для поездки</h2><button type="button" onClick={() => setOpenedOutfit(null)} aria-label="Закрыть" className="h-10 w-10 rounded-full bg-[#eee9df] text-xl">×</button></div><div className="grid grid-cols-2 gap-3">{openedOutfit.items.map((item) => <div key={item.id} className="overflow-hidden rounded-2xl bg-white">{item.photo_url && <img src={item.photo_url} alt={item.custom_name || item.category} className="aspect-square w-full object-cover" />}<p className="p-3 text-sm font-semibold">{item.custom_name || item.description || item.subcategory || item.category}</p></div>)}</div></section></div>}
    </div>
  </main>
}
