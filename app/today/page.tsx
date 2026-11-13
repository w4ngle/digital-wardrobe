'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getItems, getOutfits } from '@/lib/api'
import { Item, OutfitWithItems } from '@/lib/supabase'
import OutfitCollage from '@/components/OutfitCollage'
import { Cloud, Sparkle } from '@phosphor-icons/react'

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

  useEffect(() => {
    Promise.all([getItems(), getOutfits()])
      .then(([loadedItems, loadedOutfits]) => {
        setItems(loadedItems)
        setOutfits(loadedOutfits)
      })
      .catch(() => alert('Не удалось загрузить данные'))
  }, [])

  const favoriteItems = items.filter((item) => item.is_favorite)
  const favoriteOutfits = outfits.filter((outfit) => outfit.is_favorite)
  const planned = outfits.filter((outfit) => outfit.planned_for).sort((a, b) => a.planned_for!.localeCompare(b.planned_for!))
  const heroOutfit = planned[0] || favoriteOutfits[0] || outfits[0]
  const totalWears = items.reduce((sum, item) => sum + (item.wear_count || 0), 0)
  const mostWorn = [...items].sort((a, b) => (b.wear_count || 0) - (a.wear_count || 0))[0]
  const categoryCount = useMemo(() => items.reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] || 0) + 1
    return result
  }, {}), [items])

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
    <main className="min-h-screen bg-[#f6f0e6] text-[#1e3026]">
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-7">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#81786d]">Гардероб Эмилии</p>
          <h1 className="font-display text-6xl font-semibold leading-none tracking-[-0.04em]">Сегодня</h1>
        </header>

        <section className="mb-6 rounded-[28px] bg-[#1f422f] p-5 text-white">
          {weather ? (
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-sm text-white/70">Сейчас · {weatherLabel(weather.code)}</p><p className="mt-1 text-4xl font-semibold">{weather.temperature}°</p><p className="mt-1 text-xs text-white/60">Ощущается как {weather.apparent}°</p></div>
              <Link href="/recommend" className="rounded-full bg-[#fffaf2] px-4 py-3 text-sm font-semibold text-[#1f422f]">Подобрать образ</Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4"><div className="flex items-start gap-3"><Cloud size={28} className="mt-0.5 shrink-0" aria-hidden /><div><h2 className="font-semibold">Погода рядом</h2><p className="mt-1 text-sm text-white/65">Поможет выбрать одежду по температуре</p></div></div><button onClick={loadWeather} disabled={weatherLoading} className="shrink-0 rounded-full bg-[#fffaf2] px-4 py-3 text-sm font-semibold text-[#1f422f] disabled:opacity-60">{weatherLoading ? 'Загрузка…' : 'Показать'}</button></div>
          )}
        </section>

        <section className="mb-7 overflow-hidden rounded-[28px] border border-[#dfd4c4] bg-[#fffaf2]">
          <div className="flex items-end justify-between px-5 pb-4 pt-5">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f1820]">Для тебя</p><h2 className="font-display mt-1 text-4xl font-semibold italic text-[#6f1820]">Образ дня</h2></div>
            <Sparkle size={28} className="text-[#6f1820]" weight="duotone" aria-hidden />
          </div>
          {heroOutfit ? <OutfitCollage items={heroOutfit.items} /> : <div className="px-5 pb-6 text-sm text-[#81786d]">Собери первый образ — и он появится здесь.</div>}
          <div className="p-4"><Link href="/recommend" className="block rounded-full bg-[#1f422f] px-5 py-3.5 text-center text-sm font-semibold text-white">Подобрать другой образ</Link></div>
        </section>

        <section className="mb-7 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-[#fffaf2] p-3"><p className="text-2xl font-semibold">{items.length}</p><p className="mt-1 text-[10px] text-[#81786d]">Вещей</p></div>
          <div className="rounded-2xl bg-[#fffaf2] p-3"><p className="text-2xl font-semibold">{totalWears}</p><p className="mt-1 text-[10px] text-[#81786d]">Надеваний</p></div>
          <div className="rounded-2xl bg-[#fffaf2] p-3"><p className="text-2xl font-semibold">{favoriteItems.length + favoriteOutfits.length}</p><p className="mt-1 text-[10px] text-[#81786d]">Избранных</p></div>
        </section>

        <section className="mb-7">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Календарь образов</h2><Link href="/outfits" className="text-xs font-medium text-[#65786d]">Запланировать</Link></div>
          {planned.length ? (
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {planned.map((outfit) => (
                <article key={outfit.id} className="w-36 shrink-0 overflow-hidden rounded-2xl bg-[#faf8f4]"><OutfitCollage items={outfit.items} /><div className="p-3"><p className="truncate text-xs font-semibold">{outfit.name}</p><p className="mt-1 text-[10px] text-[#65786d]">{new Date(`${outfit.planned_for}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p></div></article>
              ))}
            </div>
          ) : <p className="rounded-2xl border border-[#ded8cd] px-4 py-7 text-center text-sm text-[#817b70]">Пока ничего не запланировано</p>}
        </section>

        <section className="mb-7">
          <h2 className="mb-3 font-semibold">Статистика</h2>
          <div className="rounded-[24px] bg-[#faf8f4] p-4">
            {mostWorn && (mostWorn.wear_count || 0) > 0 && <div className="mb-4 flex items-center gap-3 border-b border-[#e8e2d8] pb-4">{mostWorn.photo_url && <img src={mostWorn.photo_url} alt={mostWorn.description || mostWorn.category} className="h-14 w-14 rounded-xl object-cover" />}<div><p className="text-xs text-[#817b70]">Чаще всего надеваете</p><p className="mt-1 text-sm font-semibold">{mostWorn.description || mostWorn.category} · {mostWorn.wear_count}</p></div></div>}
            <div className="space-y-3">{Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).map(([category, count]) => <div key={category} className="flex items-center gap-3"><span className="w-28 truncate text-xs text-[#686258]">{category}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#ece7dd]"><div className="h-full rounded-full bg-[#65786d]" style={{ width: `${items.length ? count / items.length * 100 : 0}%` }} /></div><span className="w-5 text-right text-xs font-semibold">{count}</span></div>)}</div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Избранное</h2>
          {favoriteItems.length || favoriteOutfits.length ? <div className="grid grid-cols-4 gap-2">{favoriteItems.slice(0, 4).map((item) => <div key={item.id} className="overflow-hidden rounded-xl bg-[#faf8f4]">{item.photo_url && <img src={item.photo_url} alt={item.description || item.category} className="aspect-square w-full object-cover" />}</div>)}{favoriteOutfits.slice(0, Math.max(0, 4 - favoriteItems.length)).map((outfit) => <div key={outfit.id} className="overflow-hidden rounded-xl"><OutfitCollage items={outfit.items} /></div>)}</div> : <p className="rounded-2xl border border-[#ded8cd] px-4 py-7 text-center text-sm text-[#817b70]">Нажмите ♡ у вещи или образа</p>}
        </section>
      </div>
    </main>
  )
}
