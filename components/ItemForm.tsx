'use client'

import { useState } from 'react'
import { uploadPhoto } from '@/lib/api'
import { CATEGORIES, SEASONS, STYLES } from '@/lib/taxonomy'

type ItemFormProps = {
  onSubmit: (item: {
    category: string
    color: string
    season: string
    style: string
    description: string
    warmth: number
    formality: number
    photo_url: string | null
    ai_meta: Record<string, unknown> | null
  }) => Promise<void>
  onCancel?: () => void
}

export default function ItemForm({ onSubmit, onCancel }: ItemFormProps) {
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('')
  const [season, setSeason] = useState('')
  const [style, setStyle] = useState('')
  const [description, setDescription] = useState('')
  const [warmth, setWarmth] = useState(3)
  const [formality, setFormality] = useState(3)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
        warmth,
        formality,
        photo_url: photoUrl,
        ai_meta: null,
      })
      // Сброс формы
      setCategory('')
      setColor('')
      setSeason('')
      setStyle('')
      setDescription('')
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
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-lg border border-slate-700">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Фото
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer rounded-lg bg-cyan-600 px-3 py-3 text-center text-sm font-medium text-white active:bg-cyan-700">
            📷 Сделать фото
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="sr-only" />
          </label>
          <label className="cursor-pointer rounded-lg border border-slate-600 bg-slate-700 px-3 py-3 text-center text-sm font-medium text-slate-100 active:bg-slate-600">
            🖼️ Из галереи
            <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
          </label>
        </div>
        {photoPreview && (
          <div className="mt-3 relative w-32 h-32">
            <img
              src={photoPreview}
              alt="Превью"
              className="w-full h-full object-cover rounded border border-slate-700"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Категория
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
        >
          <option value="">Выберите категорию</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Цвет
        </label>
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          required
          placeholder="Например: чёрный, синий"
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Сезон
        </label>
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          required
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
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
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Стиль
        </label>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          required
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
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
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Описание
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Краткое описание вещи"
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Теплота (1-5)
          </label>
          <input
            type="number"
            min="1"
            max="5"
            required
            value={Number.isNaN(warmth) ? '' : warmth}
            onChange={(e) => setWarmth(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
          />
          <p className="text-xs text-slate-500 mt-1">1 - лёгкая, 5 - тёплая</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Формальность (1-5)
          </label>
          <input
            type="number"
            min="1"
            max="5"
            required
            value={Number.isNaN(formality) ? '' : formality}
            onChange={(e) => setFormality(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
          />
          <p className="text-xs text-slate-500 mt-1">1 - спорт/дом, 5 - деловой</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded transition"
        >
          {loading ? 'Добавление...' : 'Добавить вещь'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}
