'use client'

import { useEffect, useState } from 'react'
import { createTrip, getItems, getTrips, updateTrip } from '@/lib/api'
import { Item, Trip } from '@/lib/supabase'
import { buildPackingList, OutfitRecommendation, recommendOutfits, replaceOutfitItem, WEATHER, Weather } from '@/lib/recommendations'
import { CATEGORIES, STYLES } from '@/lib/taxonomy'
import FastImage from '@/components/FastImage'

type CityOption = { id: number, name: string, country?: string, admin1?: string, latitude: number, longitude: number }

export default function PackingPage() {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [items, setItems] = useState<Item[]>([])
  const [days, setDays] = useState(3)
  const [weather, setWeather] = useState<Weather>('Прохладно')
  const [style, setStyle] = useState<string>('Повседневный')
  const [tripType, setTripType] = useState('Море')
  const [city, setCity] = useState('')
  const [cityOptions, setCityOptions] = useState<CityOption[]>([])
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)
  const [cityLoading, setCityLoading] = useState(false)
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
  const [manualCategory, setManualCategory] = useState('Все')
  const [checklistEntries, setChecklistEntries] = useState(['Бельё и носки', 'Документы и деньги', 'Зарядки', 'Косметика и уход', 'Лекарства'])
  const [newChecklistEntry, setNewChecklistEntry] = useState('')

  useEffect(() => {
    getItems().then(setItems).catch(() => alert('Не удалось загрузить гардероб'))
    getTrips().then(setTrips).catch(() => getTrips().then(setTrips).catch(() => undefined))
  }, [])

  const availableItems = items.filter((item) => !item.availability || item.availability === 'available')
  const visibleManualItems = manualCategory === 'Все' ? availableItems : availableItems.filter((item) => item.category === manualCategory)

  function addChecklistDefaults() {
    const defaults = [...(beach ? ['Запасной купальник', 'Пляжная сумка'] : []), ...(training ? ['Форма для тренировок'] : [])]
    setChecklistEntries((current) => [...current, ...defaults.filter((entry) => !current.includes(entry))])
  }

  function toggleManualItem(item: Item) {
    setPacking((current) => current.some((candidate) => candidate.id === item.id)
      ? current.filter((candidate) => candidate.id !== item.id)
      : [...current, item])
  }

  function addChecklistEntry() {
    const label = newChecklistEntry.trim()
    if (!label || checklistEntries.includes(label)) return
    setChecklistEntries((current) => [...current, label])
    setNewChecklistEntry('')
  }

  async function searchCity() {
    if (city.trim().length < 2) return
    setCityLoading(true)
    setSelectedCity(null)
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=5&language=ru&format=json`)
      if (!response.ok) throw new Error('city')
      const data = await response.json()
      setCityOptions(data.results || [])
      if (!data.results?.length) alert('Город не найден — попробуйте уточнить название')
    } catch {
      setCityOptions([])
      alert('Не удалось найти город')
    } finally {
      setCityLoading(false)
    }
  }

  async function build() {
    let tripWeather = weather
    setForecast('')
    if (!selectedCity) return alert('Сначала найдите и выберите город из списка')
    if (startDate && endDate) {
      try {
          const data = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.latitude}&longitude=${selectedCity.longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`).then((response) => response.json())
          if (!data.daily) throw new Error('forecast')
          const max = Math.round(Math.max(...data.daily.temperature_2m_max)); const min = Math.round(Math.min(...data.daily.temperature_2m_min)); const rainChance = Math.max(...data.daily.precipitation_probability_max)
          setForecast(`${selectedCity.name}: ${min}…${max}°, вероятность дождя до ${rainChance}%`)
          const average = (min + max) / 2; tripWeather = average >= 20 ? 'Тепло' : average <= 5 ? 'Холодно' : 'Прохладно'; setWeather(tripWeather)
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
    addChecklistDefaults()
    setPackedIds([])
    setCheckedExtras([])
  }

  function togglePacked(id: string) {
    setPackedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id])
  }

  async function saveTrip() {
    setSaving(true)
    try {
      const payload = { details: { mode, tripType, city, cityLatitude: selectedCity?.latitude, cityLongitude: selectedCity?.longitude, cityCountry: selectedCity?.country, startDate, endDate, days, weather, style, evenings, beach, training, laundry, baggage, outfitItemIds: packingOutfits.map((outfit) => outfit.items.map((item) => item.id)) }, packed_item_ids: packing.map((item) => item.id), checklist: checklistEntries.map((label) => ({ label: label.trim(), checked: checkedExtras.includes(label) })).filter((entry) => entry.label) }
      const trip = currentTripId ? await updateTrip(currentTripId, payload) : await createTrip({ name: city || tripType, ...payload })
      setTrips((current) => currentTripId ? current.map((saved) => saved.id === trip.id ? trip : saved) : [trip, ...current])
      setCurrentTripId(trip.id)
    } catch { alert('Не удалось сохранить поездку') } finally { setSaving(false) }
  }

  function loadTrip(trip: Trip) {
    const details = trip.details
    const savedCity = String(details.city || trip.name)
    setTripType(String(details.tripType || 'Поездка')); setCity(savedCity); setCityOptions([]); setSelectedCity(details.cityLatitude && details.cityLongitude ? { id: 0, name: savedCity, country: String(details.cityCountry || ''), latitude: Number(details.cityLatitude), longitude: Number(details.cityLongitude) } : null); setStartDate(String(details.startDate || '')); setEndDate(String(details.endDate || '')); setDays(Number(details.days || 3)); setWeather((details.weather || 'Прохладно') as Weather); setStyle(String(details.style || 'Повседневный')); setEvenings(Number(details.evenings || 0)); setBeach(Boolean(details.beach)); setTraining(Boolean(details.training)); setLaundry(Boolean(details.laundry)); setBaggage(String(details.baggage || 'Чемодан'))
    setMode(details.mode === 'manual' ? 'manual' : 'auto'); setPacking(items.filter((item) => trip.packed_item_ids.includes(item.id))); setChecklistEntries(trip.checklist.map((entry) => entry.label)); setCheckedExtras(trip.checklist.filter((entry) => entry.checked).map((entry) => entry.label)); setPackedIds([])
    const outfitIds = Array.isArray(details.outfitItemIds) ? details.outfitItemIds as string[][] : []
    setPackingOutfits(outfitIds.map((ids) => ({ items: ids.map((id) => items.find((item) => item.id === id)).filter((item): item is Item => Boolean(item)), reason: '', score: 0 })).filter((outfit) => outfit.items.length))
    setCurrentTripId(trip.id); setReviewing(false); setUsedIds(Array.isArray(details.usedItemIds) ? details.usedItemIds as string[] : [])
  }

  async function saveReview() {
    if (!currentTripId) return
    setSaving(true)
    try {
      const current = trips.find((trip) => trip.id === currentTripId)
      const updated = await updateTrip(currentTripId, { details: { ...(current?.details || {}), reviewedAt: new Date().toISOString(), usedItemIds: usedIds } })
      setTrips((all) => all.map((trip) => trip.id === updated.id ? updated : trip)); setReviewing(false)
    } catch { alert('Не удалось сохранить итоги поездки') } finally { setSaving(false) }
  }

  function replacePackingOutfit(index: number) {
    const current = packingOutfits[index]
    if (!current) return
    let next = current
    current.items.forEach((item) => { next = replaceOutfitItem(items, next, item.id, { occasion: index < Math.min(days, 14) ? 'Поездка' : 'Праздник / на выход', weather, style: index < Math.min(days, 14) ? style : 'Нарядный' }) })
    const nextOutfits = packingOutfits.map((outfit, outfitIndex) => outfitIndex === index ? next : outfit)
    const stillUsed = new Set(nextOutfits.flatMap((outfit) => outfit.items.map((item) => item.id)))
    const replacedIds = new Set(current.items.filter((item) => !stillUsed.has(item.id)).map((item) => item.id))
    setPackingOutfits(nextOutfits)
    setPacking((currentPacking) => [...new Map([...currentPacking.filter((item) => !replacedIds.has(item.id)), ...next.items].map((item) => [item.id, item])).values()])
  }

  return <main className="min-h-screen bg-[#f6f0e6] text-[#1e3026]">
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
      <header className="mb-7"><p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#81786d]">В поездку</p><h1 className="text-4xl font-bold tracking-[-0.04em]">Собрать чемодан</h1><p className="mt-2 text-sm text-[#817b70]">Только доступные вещи, которые сочетаются между собой</p></header>
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#eae2d6] p-1.5">
        <button type="button" onClick={() => setMode('auto')} className={`rounded-xl px-3 py-3 text-sm font-semibold ${mode === 'auto' ? 'bg-white text-[#1f422f] shadow-sm' : 'text-[#70685e]'}`}>Собрать автоматически</button>
        <button type="button" onClick={() => setMode('manual')} className={`rounded-xl px-3 py-3 text-sm font-semibold ${mode === 'manual' ? 'bg-white text-[#1f422f] shadow-sm' : 'text-[#70685e]'}`}>Выбрать вручную</button>
      </div>
      {trips.length > 0 && <section className="mb-5"><h2 className="mb-2 text-sm font-semibold">Сохранённые поездки</h2><div className="flex gap-2 overflow-x-auto pb-1">{trips.map((trip) => <button type="button" key={trip.id} onClick={() => loadTrip(trip)} className="shrink-0 rounded-full border border-[#ddd7cc] bg-white px-4 py-2 text-xs">{trip.name}</button>)}</div></section>}
      {mode === 'auto' ? <section className="space-y-4 rounded-[24px] border border-[#dfd4c4] bg-[#fffaf2] p-4">
        <label className="block text-sm font-semibold">Тип поездки<select value={tripType} onChange={(event) => setTripType(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{['Море', 'Горы', 'Соревнования', 'Сборы', 'Короткая поездка'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <div><label className="block text-sm font-semibold">Город</label><div className="mt-2 flex gap-2"><input value={city} onChange={(event) => { setCity(event.target.value); setSelectedCity(null); setCityOptions([]) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchCity() } }} placeholder="Например, Сочи" className="min-w-0 flex-1 rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /><button type="button" onClick={searchCity} disabled={cityLoading || city.trim().length < 2} className="shrink-0 rounded-xl bg-[#1f422f] px-4 text-sm font-semibold text-white disabled:opacity-40">{cityLoading ? 'Ищу…' : 'Найти'}</button></div>{cityOptions.length > 0 && <div className="mt-2 space-y-1 rounded-xl border border-[#ddd7cc] bg-white p-1">{cityOptions.map((option) => <button type="button" key={option.id} onClick={() => { setSelectedCity(option); setCity(option.name); setCityOptions([]); setForecast('') }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3ede4]">{option.name}{option.admin1 ? `, ${option.admin1}` : ''}{option.country ? ` · ${option.country}` : ''}</button>)}</div>}<p className={`mt-2 text-xs ${selectedCity ? 'text-[#52635a]' : 'text-[#817b70]'}`}>{selectedCity ? `Выбран: ${selectedCity.name}${selectedCity.country ? `, ${selectedCity.country}` : ''}` : 'Введите название, нажмите «Найти» и выберите город'}</p></div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2"><label className="block min-w-0 overflow-hidden text-sm font-semibold">С<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 block w-full max-w-full min-w-0 appearance-none rounded-xl border border-[#ddd7cc] bg-white px-2 py-3 text-base font-normal" /></label><label className="block min-w-0 overflow-hidden text-sm font-semibold">По<input type="date" value={endDate} min={startDate} onChange={(event) => { setEndDate(event.target.value); if (startDate && event.target.value) setDays(Math.max(1, Math.round((new Date(event.target.value).getTime() - new Date(startDate).getTime()) / 86400000) + 1)) }} className="mt-2 block w-full max-w-full min-w-0 appearance-none rounded-xl border border-[#ddd7cc] bg-white px-2 py-3 text-base font-normal" /></label></div>
        <label className="block text-sm font-semibold">На сколько дней<input type="number" min="1" max="30" required value={Number.isNaN(days) ? '' : days} onChange={(event) => setDays(event.target.value === '' ? Number.NaN : event.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Вечерних выходов<input type="number" min="0" max="14" value={Number.isNaN(evenings) ? '' : evenings} onChange={(event) => setEvenings(event.target.value === '' ? Number.NaN : event.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Погода<select value={weather} onChange={(event) => setWeather(event.target.value as Weather)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{WEATHER.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="block text-sm font-semibold">Стиль<select value={style} onChange={(event) => setStyle(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{STYLES.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="block text-sm font-semibold">Багаж<select value={baggage} onChange={(event) => setBaggage(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-3 font-normal">{['Ручная кладь', 'Чемодан', 'Без ограничений / поезд'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <div className="space-y-2 rounded-2xl bg-[#f3ede4] p-4">{[[beach, setBeach, 'Будет пляж или бассейн'], [training, setTraining, 'Будут тренировки'], [laundry, setLaundry, 'Будет стиральная машина']] .map(([checked, setter, label]) => <label key={String(label)} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={checked as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="h-5 w-5" />{label as string}</label>)}</div>
        <button type="button" onClick={build} disabled={!days || days < 1 || items.length < 2 || !selectedCity} className="w-full rounded-full bg-[#1f422f] px-4 py-3.5 font-semibold text-white disabled:opacity-35">Собрать список</button>
        {forecast && <p className="rounded-xl bg-[#e5ece7] px-3 py-2 text-xs">Прогноз: {forecast}{forecast.includes('недоступен') ? ' — выберите погоду вручную выше' : ''}</p>}
      </section> : <section className="rounded-[24px] border border-[#dfd4c4] bg-[#fffaf2] p-4">
        <div className="mb-4"><h2 className="text-xl font-bold">Вещи из гардероба</h2><p className="mt-1 text-sm text-[#817b70]">Нажимайте на вещи, которые хотите взять</p></div>
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{['Все', ...CATEGORIES].map((category) => <button type="button" key={category} onClick={() => setManualCategory(category)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${manualCategory === category ? 'bg-[#1f422f] text-white' : 'border border-[#ddd7cc] bg-white'}`}>{category}</button>)}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{visibleManualItems.map((item) => { const selected = packing.some((candidate) => candidate.id === item.id); return <button type="button" key={item.id} onClick={() => toggleManualItem(item)} aria-pressed={selected} className={`relative overflow-hidden rounded-2xl border-2 bg-white text-left ${selected ? 'border-[#1f422f]' : 'border-transparent'}`}>{item.photo_url ? <FastImage src={item.photo_url} alt={item.custom_name || item.category} className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-[#eee9df]" />}<span className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full ${selected ? 'bg-[#1f422f] text-white' : 'bg-white/85 text-transparent'}`}>✓</span><span className="block truncate p-3 text-sm font-semibold">{item.custom_name || item.description || item.subcategory || item.category}</span></button> })}</div>
        <p className="mt-4 text-sm font-semibold">Выбрано: {packing.length}</p>
      </section>}
      {packing.length > 0 && <><section className="mt-7"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-bold">Взять с собой</h2><p className="mt-1 text-xs text-[#817b70]">{city || tripType} · {days} дн. · {baggage}{laundry ? ' · со стиркой' : ''}</p></div><span className="text-xs text-[#817b70]">Собрано {packedIds.length} из {packing.length}</span></div>{packingOutfits.length > 0 && <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{packingOutfits.map((outfit, index) => <div key={`${index}:${outfit.items.map((item) => item.id).join(':')}`} className="w-44 shrink-0 rounded-2xl bg-white p-3"><button type="button" onClick={() => setOpenedOutfit(outfit)} className="w-full text-left"><p className="text-xs font-bold">Образ {index + 1}</p><p className="mt-1 line-clamp-3 text-[11px] text-[#817b70]">{outfit.items.map((item) => item.custom_name || item.subcategory || item.category).join(' + ')}</p></button><button type="button" onClick={() => replacePackingOutfit(index)} className="mt-2 w-full rounded-lg bg-[#f3ede4] px-2 py-2 text-[11px] font-semibold">Заменить образ</button></div>)}</div>}<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{packing.map((item) => { const packed = packedIds.includes(item.id); return <button type="button" key={item.id} onClick={() => reviewing ? setUsedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]) : togglePacked(item.id)} aria-pressed={reviewing ? usedIds.includes(item.id) : packed} className={`relative overflow-hidden rounded-[20px] bg-[#faf8f4] text-left transition ${(reviewing ? usedIds.includes(item.id) : packed) ? 'opacity-55' : ''}`}>{item.photo_url && <FastImage src={item.photo_url} alt={item.description || item.category} className="aspect-square w-full object-cover" />}<span className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold ${(reviewing ? usedIds.includes(item.id) : packed) ? 'border-[#1f422f] bg-[#1f422f] text-white' : 'border-white bg-white/80 text-transparent'}`}>✓</span><span className="block p-3"><span className={`block truncate text-sm font-semibold ${packed && !reviewing ? 'line-through' : ''}`}>{item.custom_name || item.description || item.subcategory || item.category}</span><span className="mt-1 block text-xs text-[#817b70]">{item.category} · {item.color}</span></span></button> })}</div></section><section className="mt-7 rounded-[24px] bg-[#fffaf2] p-4"><h2 className="mb-3 text-xl font-bold">Не забыть</h2><div className="space-y-2">{checklistEntries.map((entry, index) => <div key={`${entry}:${index}`} className={`flex items-center gap-2 rounded-xl p-2 ${checkedExtras.includes(entry) ? 'bg-[#e5ece7]' : 'bg-[#f3ede4]'}`}><input type="checkbox" checked={checkedExtras.includes(entry)} onChange={() => setCheckedExtras((current) => current.includes(entry) ? current.filter((value) => value !== entry) : [...current, entry])} className="h-5 w-5 shrink-0" /><input value={entry} onChange={(event) => setChecklistEntries((current) => current.map((value, entryIndex) => entryIndex === index ? event.target.value : value))} className={`min-w-0 flex-1 bg-transparent px-1 text-sm ${checkedExtras.includes(entry) ? 'line-through' : ''}`} aria-label={`Пункт чеклиста ${index + 1}`} /><button type="button" onClick={() => { setChecklistEntries((current) => current.filter((_, entryIndex) => entryIndex !== index)); setCheckedExtras((current) => current.filter((value) => value !== entry)) }} aria-label={`Удалить ${entry}`} className="h-8 w-8 shrink-0 rounded-full text-[#6f1820]">×</button></div>)}</div><div className="mt-3 flex gap-2"><input value={newChecklistEntry} onChange={(event) => setNewChecklistEntry(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addChecklistEntry() } }} placeholder="Добавить пункт" className="min-w-0 flex-1 rounded-xl border border-[#ddd7cc] bg-white px-3 py-2 text-sm" /><button type="button" onClick={addChecklistEntry} className="rounded-xl bg-[#1f422f] px-4 text-sm font-semibold text-white">Добавить</button></div><button type="button" onClick={saveTrip} disabled={saving} className="mt-4 w-full rounded-full bg-[#1f422f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{saving ? 'Сохраняю…' : 'Сохранить поездку'}</button>{currentTripId && <button type="button" onClick={() => reviewing ? saveReview() : setReviewing(true)} disabled={saving} className="mt-2 w-full rounded-full border border-[#1f422f] px-4 py-3 text-sm font-semibold">{reviewing ? `Сохранить: использовано ${usedIds.length}` : 'После поездки: что пригодилось?'}</button>}</section></>}
      {openedOutfit && <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-3 sm:items-center sm:justify-center" onClick={() => setOpenedOutfit(null)}><section className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-[#fffaf2] p-5" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Образ для поездки</h2><button type="button" onClick={() => setOpenedOutfit(null)} aria-label="Закрыть" className="h-10 w-10 rounded-full bg-[#eee9df] text-xl">×</button></div><div className="grid grid-cols-2 gap-3">{openedOutfit.items.map((item) => <div key={item.id} className="overflow-hidden rounded-2xl bg-white">{item.photo_url && <FastImage src={item.photo_url} alt={item.custom_name || item.category} className="aspect-square w-full object-cover" />}<p className="p-3 text-sm font-semibold">{item.custom_name || item.description || item.subcategory || item.category}</p></div>)}</div></section></div>}
    </div>
  </main>
}
