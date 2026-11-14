'use client'

import { useState } from 'react'
import { uploadPhoto } from '@/lib/api'
import { CATEGORIES, FITS, LAYER_ROLES, LENGTHS, PATTERNS, SEASONS, STYLES, SUBCATEGORIES, supportsLength, supportsWarmth } from '@/lib/taxonomy'
import { Camera, ImageSquare } from '@phosphor-icons/react'
import { removeImageBackground } from '@/lib/background-removal'

type ItemFormProps = {
  onSubmit: (item: {
    category: string
    color: string
    season: string
    style: string
    description: string
    warmth?: number
    formality: number
    photo_url: string | null
    ai_meta: Record<string, unknown> | null
    subcategory: string | null
    custom_name: string | null
    fit: string | null
    length: string | null
    pattern: string | null
    layer_role: string | null
    comfort: number
    confidence: number
    needs_underlayer: boolean
    rain_safe: boolean
  }) => Promise<void>
  onCancel?: () => void
}

export default function ItemForm({ onSubmit, onCancel }: ItemFormProps) {
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('')
  const [season, setSeason] = useState('')
  const [style, setStyle] = useState('')
  const [description, setDescription] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [customName, setCustomName] = useState('')
  const [fit, setFit] = useState('Обычная')
  const [length, setLength] = useState('')
  const [pattern, setPattern] = useState('Однотонная')
  const [layerRole, setLayerRole] = useState('Базовый слой')
  const [comfort, setComfort] = useState(3)
  const [confidence, setConfidence] = useState(3)
  const [needsUnderlayer, setNeedsUnderlayer] = useState(false)
  const [rainSafe, setRainSafe] = useState(false)
  const [warmth, setWarmth] = useState(3)
  const [formality, setFormality] = useState(3)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [removingBackground, setRemovingBackground] = useState(false)

  // Сжатие изображения на клиенте
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!

          // Ресайз до максимум 1024px по большей стороне
          const maxSize = 1024
          let width = img.width
          let height = img.height

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          } else if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          // JPEG 0.8 качество
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveBackground = async () => {
    if (!photoFile) return
    setRemovingBackground(true)
    try {
      const processed = await removeImageBackground(photoFile)
      setPhotoFile(processed)
      setPhotoPreview(URL.createObjectURL(processed))
    } catch (error) {
      console.error('Ошибка удаления фона:', error)
      alert('Не удалось убрать фон. Можно сохранить исходное фото.')
    } finally {
      setRemovingBackground(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)

      try {
        const compressedDataUrl = await compressImage(file)
        setPhotoPreview(compressedDataUrl)

      } catch (error) {
        console.error('Ошибка обработки фото:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let photoUrl = null
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile)
      }
      await onSubmit({
        category,
        color,
        season,
        style,
        description,
        warmth: supportsWarmth(category) && !Number.isNaN(warmth) ? warmth : undefined,
        formality,
        photo_url: photoUrl,
        ai_meta: null,
        subcategory: subcategory || null,
        custom_name: customName.trim() || null,
        fit,
        length: supportsLength(category, subcategory) ? length || null : null,
        pattern,
        layer_role: layerRole,
        comfort,
        confidence,
        needs_underlayer: needsUnderlayer,
        rain_safe: rainSafe,
      })
      // Сброс формы
      setCategory('')
      setColor('')
      setSeason('')
      setStyle('')
      setDescription('')
      setSubcategory('')
      setCustomName('')
      setFit('Обычная')
      setLength('')
      setPattern('Однотонная')
      setLayerRole('Базовый слой')
      setComfort(3)
      setConfidence(3)
      setNeedsUnderlayer(false)
      setRainSafe(false)
      setWarmth(3)
      setFormality(3)
      setPhotoFile(null)
      setPhotoPreview(null)
    } catch (error) {
      console.error('Ошибка при добавлении вещи:', error)
      alert('Не удалось добавить вещь')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[24px] border border-[#dfd4c4] bg-[#fffaf2] p-5 sm:p-6">
      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1e3026]">
          Фото
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f422f] px-3 py-3 text-center text-sm font-semibold text-white active:scale-[0.98]">
            <Camera size={18} aria-hidden /> Сделать фото
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="sr-only" />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfc2b2] bg-[#f5ede2] px-3 py-3 text-center text-sm font-semibold text-[#1f422f] active:scale-[0.98]">
            <ImageSquare size={18} aria-hidden /> Из галереи
            <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
          </label>
        </div>
        {photoPreview && (
          <div className="mt-3 flex items-end gap-3">
          <div className="relative h-32 w-32 bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] bg-[length:16px_16px]">
            <img
              src={photoPreview}
              alt="Превью"
              className="h-full w-full rounded-xl border border-[#dfd4c4] object-cover"
            />
          </div>
          <button type="button" onClick={handleRemoveBackground} disabled={removingBackground} className="rounded-xl border border-[#cfc2b2] bg-white px-3 py-2 text-xs font-semibold text-[#1f422f] disabled:opacity-50">{removingBackground ? 'Убираю фон…' : 'Убрать фон'}</button>
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1e3026]">
          Категория
        </label>
        <select
          value={category}
          onChange={(e) => {
            const next = e.target.value as keyof typeof SUBCATEGORIES
            setCategory(next)
            setSubcategory('')
            setLayerRole(next === 'Верхняя одежда' ? 'Верхняя одежда' : ['Платье', 'Комплект', 'Купальник', 'Домашняя одежда'].includes(next) ? 'Самостоятельная вещь' : 'Базовый слой')
          }}
          required
          className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
        >
          <option value="">Выберите категорию</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {category && <div><label className="mb-2 block text-sm font-semibold text-[#1e3026]">Тип вещи</label><select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"><option value="">Выберите тип</option>{SUBCATEGORIES[category as keyof typeof SUBCATEGORIES].map((option) => <option key={option}>{option}</option>)}</select></div>}

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1e3026]">
          Цвет
        </label>
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          required
          placeholder="Например: чёрный, синий"
          className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026] placeholder:text-[#9b9185]"
        />
      </div>

      <div><label className="mb-2 block text-sm font-semibold text-[#1e3026]">Своё название <span className="font-normal text-[#81786d]">необязательно</span></label><input value={customName} onChange={(e) => setCustomName(e.target.value)} maxLength={80} placeholder="Например: любимый синий топ" className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026] placeholder:text-[#9b9185]" /></div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold text-[#1e3026]">Посадка<select value={fit} onChange={(e) => setFit(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal">{FITS.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="text-sm font-semibold text-[#1e3026]">Принт / фактура<select value={pattern} onChange={(e) => setPattern(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal">{PATTERNS.map((option) => <option key={option}>{option}</option>)}</select></label>
      </div>

      {supportsLength(category, subcategory) && <label className="block text-sm font-semibold text-[#1e3026]">Длина<select value={length} onChange={(e) => setLength(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal"><option value="">Не указывать</option>{LENGTHS.map((option) => <option key={option}>{option}</option>)}</select></label>}

      {category === 'Верх' && <label className="block text-sm font-semibold text-[#1e3026]">Роль в образе<select value={layerRole} onChange={(e) => setLayerRole(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal">{LAYER_ROLES.map((option) => <option key={option}>{option}</option>)}</select></label>}

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1e3026]">
          Сезон
        </label>
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          required
          className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
        >
          <option value="">Выберите сезон</option>
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1e3026]">
          Стиль
        </label>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          required
          className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
        >
          <option value="">Выберите стиль</option>
          {STYLES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#1e3026]">
          Описание
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Краткое описание вещи"
          className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026] placeholder:text-[#9b9185]"
        />
      </div>

      <details className="rounded-2xl border border-[#dfd4c4] bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#1e3026]">Дополнительные характеристики</summary>
        <div className="mt-4 grid grid-cols-2 gap-4">
        {supportsWarmth(category) && <div>
          <label className="mb-2 block text-sm font-semibold text-[#1e3026]">
            Теплота (1-5)
          </label>
          <input
            type="number"
            min="1"
            max="5"
            value={Number.isNaN(warmth) ? '' : warmth}
            onChange={(e) => setWarmth(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)}
            className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
          />
          <p className="mt-1 text-xs text-[#81786d]">1 — лёгкая, 5 — тёплая</p>
        </div>}

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#1e3026]">
            Формальность (1-5)
          </label>
          <input
            type="number"
            min="1"
            max="5"
            required
            value={Number.isNaN(formality) ? '' : formality}
            onChange={(e) => setFormality(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)}
            className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
          />
          <p className="mt-1 text-xs text-[#81786d]">1 — спорт/дом, 5 — деловой</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold text-[#1e3026]">Комфорт (1–5)<input type="number" min="1" max="5" required value={Number.isNaN(comfort) ? '' : comfort} onChange={(e) => setComfort(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#1e3026]">Уверенность (1–5)<input type="number" min="1" max="5" required value={Number.isNaN(confidence) ? '' : confidence} onChange={(e) => setConfidence(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal" /></label>
      </div>

      <div className="space-y-2 rounded-2xl bg-[#f3ede4] p-4">
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={needsUnderlayer} onChange={(e) => setNeedsUnderlayer(e.target.checked)} className="h-5 w-5" /><span><strong>Нужен особый нижний слой</strong><span className="block text-xs text-[#81786d]">Например, вещь просвечивает</span></span></label>
        {(category === 'Обувь' || category === 'Верхняя одежда') && <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={rainSafe} onChange={(e) => setRainSafe(e.target.checked)} className="h-5 w-5" /><span><strong>Подходит для дождя</strong></span></label>}
      </div>
      </details>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-xl bg-[#6f1820] px-4 py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? 'Добавление...' : 'Добавить вещь'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#cfc2b2] px-4 py-3 font-semibold text-[#685f55] transition active:scale-[0.98]"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}
