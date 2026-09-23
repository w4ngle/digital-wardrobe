'use client'

import { useState } from 'react'
import { uploadPhoto } from '@/lib/api'

type ItemFormProps = {
  onSubmit: (item: {
    category: string
    color: string
    season: string
    style: string
    photo_url: string | null
  }) => Promise<void>
  onCancel?: () => void
}

const categories = ['Верх', 'Низ', 'Обувь', 'Верхняя одежда', 'Аксессуар']
const seasons = ['Лето', 'Зима', 'Демисезон', 'Всесезонное']
const styles = ['Повседневный', 'Деловой', 'Спортивный', 'Нарядный']

export default function ItemForm({ onSubmit, onCancel }: ItemFormProps) {
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('')
  const [season, setSeason] = useState('')
  const [style, setStyle] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = async () => {
        const dataUrl = reader.result as string
        setPhotoPreview(dataUrl)

        setAnalyzing(true)
        try {
          const response = await fetch('/api/analyze-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: dataUrl })
          })

          if (response.ok) {
            const result = await response.json()
            if (result.category) setCategory(result.category)
            if (result.color) setColor(result.color)
            if (result.season) setSeason(result.season)
            if (result.style) setStyle(result.style)
          }
        } catch (error) {
          console.error('Ошибка анализа фото:', error)
        } finally {
          setAnalyzing(false)
        }
      }
      reader.readAsDataURL(file)
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
      await onSubmit({ category, color, season, style, photo_url: photoUrl })
      setCategory('')
      setColor('')
      setSeason('')
      setStyle('')
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
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer hover:file:bg-cyan-700"
        />
        {photoPreview && (
          <div className="mt-3 relative w-32 h-32">
            <img
              src={photoPreview}
              alt="Превью"
              className="w-full h-full object-cover rounded border border-slate-700"
            />
          </div>
        )}
        {analyzing && (
          <p className="mt-2 text-sm text-cyan-400">🔍 Анализирую фото...</p>
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
          {categories.map((cat) => (
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
          {seasons.map((s) => (
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
          {styles.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || analyzing}
          className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded transition"
        >
          {loading ? 'Добавление...' : analyzing ? 'Анализ...' : 'Добавить вещь'}
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
