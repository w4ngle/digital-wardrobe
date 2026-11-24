'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getItems, getOutfits, getWearHistory, markItemWorn, unmarkItemWorn, updateItem, updateOutfit } from '@/lib/api'
import { Item, OutfitWithItems, WearRecord } from '@/lib/supabase'
import OutfitCollage from '@/components/OutfitCollage'
import { Cloud } from '@phosphor-icons/react'
import FastImage from '@/components/FastImage'
import { moscowDate } from '@/lib/date'
import { recommendOutfits } from '@/lib/recommendations'

type Weather = { temperature: number, apparent: number, code: number }

function weatherLabel(code: number) {
  if (code === 0) return 'Ясно'
  if (code <= 3) return 'Облачно'
  if (code <= 48) return 'Туман'
  if (code <= 67) return 'Дождь'
  if (code <= 77) return 'Снег'
  return 'Осадки'
}

export default function TodayPage() {
  const [items, setItems] = useState<Item[]>([])
  const [outfits, setOutfits] = useState<OutfitWithItems[]>([])
  const [weather, setWeather] = useState<Weather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [history, setHistory] = useState<WearRecord[]>([])
  const [openedItems, setOpenedItems] = useState<Item[] | null>(null)
  const [openedTitle, setOpenedTitle] = useState('')
  const [openedFavorite, setOpenedFavorite] = useState<{ type: 'item' | 'outfit', id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [wearing, setWearing] = useState(false)
  const [heroWorn, setHeroWorn] = useState<boolean | null>(null)
  const [notice, setNotice] = useState('')

  function openDetails(title: string, detailItems: Item[], favorite?: { type: 'item' | 'outfit', id: string }) {
    setOpenedTitle(title)
    setOpenedItems(detailItems)
    setOpenedFavorite(favorite || null)
  }

  async function removeOpenedFavorite() {
    if (!openedFavorite) return
    try {
      if (openedFavorite.type === 'item') {
        await updateItem(openedFavorite.id, { is_favorite: false })
        setItems((current) => current.map((item) => item.id === openedFavorite.id ? { ...item, is_favorite: false } : item))
      } else {
        await updateOutfit(openedFavorite.id, { is_favorite: false, rating: null })
        setOutfits((current) => current.map((outfit) => outfit.id === openedFavorite.id ? { ...outfit, is_favorite: false, rating: null } : outfit))
      }
      setOpenedItems(null)
      setOpenedFavorite(null)
    } catch {
      alert('Не удалось убрать из избранного')
    }
  }

  useEffect(() => {
    Promise.all([getItems(), getOutfits(), getWearHistory()])
      .then(([loadedItems, loadedOutfits, loadedHistory]) => {
        setItems(loadedItems)
        setOutfits(loadedOutfits)
        setHistory(loadedHistory)
      })
      .catch(() => alert('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [])

  const favoriteItems = items.filter((item) => item.is_favorite)
  const usableOutfits = outfits.filter((outfit) => outfit.rating !== -1)
  const favoriteOutfits = usableOutfits.filter((outfit) => outfit.is_favorite || outfit.rating === 1)
  const today = new Date().toISOString().slice(0, 10)
  const planned = usableOutfits.filter((outfit) => outfit.planned_for && outfit.planned_for >= today).sort((a, b) => a.planned_for!.localeCompare(b.planned_for!))
  const heroOutfit = useMemo(() => {
    if (!items.length) return null
    const weatherType = weather ? weather.temperature >= 26 ? 'Жарко' : weather.temperature >= 18 ? 'Тепло' : weather.temperature <= 5 ? 'Холодно' : 'Прохладно' : 'Прохладно'
    const recommendation = recommendOutfits(items, {
      occasion: 'На каждый день', weather: weatherType, style: 'Повседневный',
      rain: Boolean(weather && weather.code >= 51 && weather.code <= 67),
    }, 1)[0]
    return recommendation ? { name: 'Образ по погоде', occasion: 'На каждый день', notes: recommendation.reason, items: recommendation.items } : null
  }, [items, weather])
  const totalWears = items.reduce((sum, item) => sum + (item.wear_count || 0), 0)
  const mostWorn = [...items].sort((a, b) => (b.wear_count || 0) - (a.wear_count || 0))[0]
  const categoryCount = useMemo(() => items.reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] || 0) + 1
    return result
  }, {}), [items])
  const favoritePair = useMemo(() => {
    const pairs = new Map<string, { items: Item[], count: number }>()
    outfits.filter((outfit) => outfit.is_favorite || outfit.rating === 1).forEach((outfit) => {
      for (let first = 0; first < outfit.items.length; first++) for (let second = first + 1; second < outfit.items.length; second++) {
        const pair = [outfit.items[first], outfit.items[second]].sort((a, b) => a.id.localeCompare(b.id))
        const key = pair.map((item) => item.id).join(':')
        pairs.set(key, { items: pair, count: (pairs.get(key)?.count || 0) + 1 })
      }
    })
    return [...pairs.values()].sort((a, b) => b.count - a.count)[0]
  }, [outfits])

  async function wearHeroOutfit() {
    if (!heroOutfit || wearing) return
    setWearing(true)
    try {
      const today = moscowDate()
      const alreadyWorn = heroWorn ?? heroOutfit.items.every((item) => item.last_worn_at && moscowDate(item.last_worn_at) === today)
      const worn = await Promise.all(heroOutfit.items.map((item) => alreadyWorn ? unmarkItemWorn(item.id) : markItemWorn(item.id)))
      const byId = new Map(worn.map((item) => [item.id, item]))
      setItems((current) => current.map((item) => byId.get(item.id) || item))
      setHeroWorn(!alreadyWorn)
      setNotice(alreadyWorn ? `Отметка образа «${heroOutfit.name}» отменена` : `Образ «${heroOutfit.name}» отмечен на сегодня`)
      window.setTimeout(() => setNotice(''), 3000)
    } catch { alert('Не удалось отметить образ') } finally { setWearing(false) }
  }

  const heroIsWorn = heroWorn ?? Boolean(heroOutfit?.items.length && heroOutfit.items.every((item) => item.last_worn_at && moscowDate(item.last_worn_at) === moscowDate()))

  async function fetchWeather(latitude: number, longitude: number) {
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.searchParams.set('latitude', String(latitude))
      url.searchParams.set('longitude', String(longitude))
      url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code')
      url.searchParams.set('timezone', 'auto')
      const response = await fetch(url)
      if (!response.ok) throw new Error('weather')
      const data = await response.json()
      setWeather({ temperature: Math.round(data.current.temperature_2m), apparent: Math.round(data.current.apparent_temperature), code: data.current.weather_code })
    } catch {
      alert('Не удалось получить погоду')
    } finally {
      setWeatherLoading(false)
    }
  }

  function loadWeather() {
    setWeatherLoading(true)
    const locationManager = window.Telegram?.WebApp.LocationManager
    if (locationManager) {
      locationManager.init(() => {
        if (!locationManager.isLocationAvailable) {
          setWeatherLoading(false)
          return alert('Геолокация недоступна на этом устройстве')
        }
        if (locationManager.isAccessRequested && !locationManager.isAccessGranted) {
          setWeatherLoading(false)
          locationManager.openSettings()
          return
        }
        locationManager.getLocation((location) => {
          if (location) return void fetchWeather(location.latitude, location.longitude)
          setWeatherLoading(false)
          alert('Доступ не выдан. Нажмите «Показать» ещё раз, чтобы открыть настройки')
        })
      })
      return
    }

    if (!navigator.geolocation) {
      setWeatherLoading(false)
      return alert('Геолокация не поддерживается')
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => void fetchWeather(coords.latitude, coords.longitude),
      () => {
        setWeatherLoading(false)
        alert('Разрешите доступ к геолокации, чтобы показать погоду')
      },
      { timeout: 10000 },
    )
  }

  return (
    <main className="min-h-screen bg-white text-[#222222]">
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <p className="mb-1 text-sm text-[#6a6a6a]">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em]">Доброе утро</h1>
          </div>
        </header>

        <section className="mb-8 rounded-[14px] bg-[#f7f7f7] p-4">
          {weather ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3"><Cloud size={22} className="text-[#1f422f]" aria-hidden /><div><p className="text-sm font-medium">{weatherLabel(weather.code)} · {weather.temperature}°</p><p className="mt-0.5 text-xs text-[#6a6a6a]">Ощущается как {weather.apparent}°</p></div></div>
              <Link href={`/recommend?weather=${encodeURIComponent(weather.temperature >= 26 ? 'Жарко' : weather.temperature >= 18 ? 'Тепло' : weather.temperature <= 5 ? 'Холодно' : 'Прохладно')}${weather.code >= 51 && weather.code <= 67 ? '&rain=1' : ''}`} className="text-sm font-semibold text-[#1f422f] underline underline-offset-4">Учесть</Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><Cloud size={22} className="shrink-0 text-[#1f422f]" aria-hidden /><div><h2 className="text-sm font-medium">Погода рядом</h2><p className="mt-0.5 text-xs text-[#6a6a6a]">Для более точного образа</p></div></div><button onClick={loadWeather} disabled={weatherLoading} className="shrink-0 text-sm font-semibold text-[#1f422f] underline underline-offset-4 disabled:opacity-60">{weatherLoading ? 'Загрузка…' : 'Показать'}</button></div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">Образ на сегодня</h2>
          <div className="overflow-hidden rounded-[14px] bg-[#f7f7f7]">
            {loading ? <div className="h-64 animate-pulse bg-[#e6e1d8]" /> : heroOutfit ? <OutfitCollage items={heroOutfit.items} onExpand={() => openDetails(heroOutfit.name, heroOutfit.items)} /> : <div className="px-5 py-12 text-center text-sm text-[#81786d]">Собери первый образ — и он появится здесь.</div>}
          </div>
          {heroOutfit && <div className="py-4"><h3 className="font-semibold">{heroOutfit.name}</h3>{(heroOutfit.occasion || heroOutfit.notes) && <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#6a6a6a]">{heroOutfit.occasion || heroOutfit.notes}</p>}</div>}
          <div className="grid grid-cols-2 gap-2">
            {heroOutfit && <button type="button" onClick={wearHeroOutfit} disabled={wearing} aria-pressed={heroIsWorn} className="rounded-lg bg-[#1f422f] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60">{wearing ? 'Сохраняем…' : heroIsWorn ? 'Надето сегодня' : 'Надену'}</button>}
            <Link href="/recommend" className="rounded-lg border border-[#222222] px-4 py-3.5 text-center text-sm font-semibold">Другой образ</Link>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-3 border-y border-[#dddddd] py-4">
          <div><p className="text-xl font-semibold">{loading ? '—' : items.length}</p><p className="mt-1 text-xs text-[#81786d]">вещей</p></div>
          <div className="border-x border-[#dddddd] px-4"><p className="text-xl font-semibold">{loading ? '—' : totalWears}</p><p className="mt-1 text-xs text-[#81786d]">надеваний</p></div>
          <div className="pl-4"><p className="text-xl font-semibold">{loading ? '—' : favoriteItems.length + favoriteOutfits.length}</p><p className="mt-1 text-xs text-[#81786d]">избранных</p></div>
        </section>

        <section className="mb-7">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Календарь образов</h2><Link href="/outfits" className="text-xs font-medium text-[#65786d]">Запланировать</Link></div>
          {planned.length ? (
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {planned.map((outfit) => (
                <button type="button" onClick={() => openDetails(outfit.name, outfit.items)} key={outfit.id} className="w-36 shrink-0 overflow-hidden rounded-2xl bg-[#faf8f4] text-left"><OutfitCollage items={outfit.items} /><span className="block p-3"><span className="block truncate text-xs font-semibold">{outfit.name}</span><span className="mt-1 block text-[10px] text-[#65786d]">{new Date(`${outfit.planned_for}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span></span></button>
              ))}
            </div>
          ) : <p className="rounded-2xl border border-[#ded8cd] px-4 py-7 text-center text-sm text-[#817b70]">Пока ничего не запланировано</p>}
        </section>

        <section className="mb-7">
          <h2 className="mb-3 font-semibold">Недавно носила</h2>
          {history.length ? <div className="space-y-2">{history.slice(0, 7).map((entry) => <button type="button" onClick={() => entry.item && openDetails(entry.item.custom_name || entry.item.description || entry.item.subcategory || entry.item.category, [entry.item])} key={entry.id} className="flex w-full items-center gap-3 rounded-2xl bg-[#faf8f4] p-3 text-left">{entry.item?.photo_url && <FastImage src={entry.item.photo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />}<span className="min-w-0"><span className="block truncate text-sm font-semibold">{entry.item?.custom_name || entry.item?.description || entry.item?.subcategory || entry.item?.category || 'Вещь'}</span><span className="mt-1 block text-xs text-[#817b70]">{new Date(entry.worn_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}{entry.laundry_decision === 'laundry' ? ' · в стирке' : ''}</span></span></button>)}</div> : <p className="rounded-2xl border border-[#ded8cd] px-4 py-7 text-center text-sm text-[#817b70]">История появится после отметки «Надела сегодня»</p>}
        </section>

        <section className="mb-7">
          <h2 className="mb-3 font-semibold">Статистика</h2>
          <div className="rounded-[24px] bg-[#faf8f4] p-4">
            {favoritePair && <div className="mb-4 border-b border-[#e8e2d8] pb-4"><p className="mb-2 text-xs text-[#817b70]">Любимое сочетание</p><div className="flex items-center gap-3">{favoritePair.items.map((item) => item.photo_url && <FastImage key={item.id} src={item.photo_url} alt={item.description || item.category} className="h-14 w-14 rounded-xl object-cover" />)}<p className="text-sm font-semibold">Встречается в любимых образах · {favoritePair.count}</p></div></div>}
            {mostWorn && (mostWorn.wear_count || 0) > 0 && <div className="mb-4 flex items-center gap-3 border-b border-[#e8e2d8] pb-4">{mostWorn.photo_url && <FastImage src={mostWorn.photo_url} alt={mostWorn.description || mostWorn.category} className="h-14 w-14 rounded-xl object-cover" />}<div><p className="text-xs text-[#817b70]">Чаще всего надеваете</p><p className="mt-1 text-sm font-semibold">{mostWorn.description || mostWorn.category} · {mostWorn.wear_count}</p></div></div>}
            <div className="space-y-3">{Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).map(([category, count]) => <div key={category} className="flex items-center gap-3"><span className="w-28 truncate text-xs text-[#686258]">{category}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#ece7dd]"><div className="h-full rounded-full bg-[#65786d]" style={{ width: `${items.length ? count / items.length * 100 : 0}%` }} /></div><span className="w-5 text-right text-xs font-semibold">{count}</span></div>)}</div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Избранное</h2>
          {favoriteItems.length || favoriteOutfits.length ? <div className="grid grid-cols-4 gap-2">{favoriteItems.map((item) => <button type="button" onClick={() => openDetails(item.custom_name || item.description || item.category, [item], { type: 'item', id: item.id })} key={item.id} className="overflow-hidden rounded-xl bg-[#faf8f4]">{item.photo_url && <FastImage src={item.photo_url} alt={item.description || item.category} className="aspect-square w-full object-cover" />}</button>)}{favoriteOutfits.map((outfit) => <button type="button" onClick={() => openDetails(outfit.name, outfit.items, { type: 'outfit', id: outfit.id })} key={outfit.id} className="overflow-hidden rounded-xl"><OutfitCollage items={outfit.items} /></button>)}</div> : <p className="rounded-2xl border border-[#ded8cd] px-4 py-7 text-center text-sm text-[#817b70]">Нажмите ♡ у вещи или образа</p>}
        </section>
      </div>
      {openedItems && <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-3 sm:items-center sm:justify-center" onClick={() => setOpenedItems(null)}><section className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-[#fffaf2] p-5" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">{openedTitle}</h2><button type="button" onClick={() => setOpenedItems(null)} className="h-10 w-10 rounded-full bg-[#eee9df] text-xl" aria-label="Закрыть">×</button></div><div className="grid grid-cols-2 gap-3">{openedItems.map((item) => <div key={item.id} className="overflow-hidden rounded-2xl bg-white">{item.photo_url && <FastImage src={item.photo_url} alt={item.custom_name || item.category} className="aspect-square w-full object-cover" />}<div className="p-3"><p className="text-sm font-semibold">{item.custom_name || item.description || item.subcategory || item.category}</p><p className="mt-1 text-xs text-[#817b70]">{item.category} · {item.color}</p></div></div>)}</div>{openedFavorite && <button type="button" onClick={removeOpenedFavorite} className="mt-4 w-full rounded-full border border-[#6f1820] px-4 py-3 text-sm font-semibold text-[#6f1820]">Убрать из избранного</button>}</section></div>}
      {notice && <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-[#1f422f] px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">{notice}</div>}
    </main>
  )
}
