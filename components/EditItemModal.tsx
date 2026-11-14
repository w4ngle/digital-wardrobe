'use client'

import { useState } from 'react'
import { Item } from '@/lib/supabase'
import { uploadPhoto } from '@/lib/api'
import { Camera, ImageSquare, X } from '@phosphor-icons/react'
import { removeImageBackground } from '@/lib/background-removal'

type EditItemModalProps = {
  item: Item
  onSave: (id: string, data: {
    category: string
    color: string
    season: string
    style: string
    photo_url: string | null
  }) => Promise<void>
  onClose: () => void
}

const categories = ['Верх', 'Низ', 'Обувь', 'Верхняя одежда', 'Аксессуар']
const seasons = ['Лето', 'Зима', 'Демисезон', 'Всесезонное']
const styles = ['Повседневный', 'Деловой', 'Спортивный', 'Нарядный']

export default function EditItemModal({ item, onSave, onClose }: EditItemModalProps) {
  const [category, setCategory] = useState(item.category)
  const [color, setColor] = useState(item.color)
  const [season, setSeason] = useState(item.season)
  const [style, setStyle] = useState(item.style)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(item.photo_url)
  const [loading, setLoading] = useState(false)
  const [removingBackground, setRemovingBackground] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let photoUrl = item.photo_url
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile)
      }
      await onSave(item.id, { category, color, season, style, photo_url: photoUrl })
      onClose()
    } catch (error) {
      console.error('Ошибка редактирования:', error)
      alert('Не удалось сохранить изменения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#14231b]/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[#fffaf2] sm:rounded-[28px]" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold text-[#1e3026]">Редактировать вещь</h2><button type="button" onClick={onClose} className="rounded-full p-2 text-[#6f1820]" aria-label="Закрыть"><X size={22} aria-hidden /></button></div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e3026]">Фото</label>
              {photoPreview && (
                <div className="mb-3 w-32 h-32">
                  <img src={photoPreview} alt="Превью" className="h-full w-full rounded-xl border border-[#dfd4c4] object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f422f] px-3 py-3 text-sm font-semibold text-white"><Camera size={18} aria-hidden />Сделать<input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="sr-only" /></label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfc2b2] px-3 py-3 text-sm font-semibold text-[#1f422f]"><ImageSquare size={18} aria-hidden />Из галереи<input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" /></label>
              </div>
              {photoFile && <button type="button" onClick={handleRemoveBackground} disabled={removingBackground} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-2.5 text-sm font-semibold text-[#1f422f] disabled:opacity-50">{removingBackground ? 'Убираю фон…' : 'Убрать фон'}</button>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e3026]">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e3026]">Цвет</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                required
                className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e3026]">Сезон</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                required
                className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e3026]">Стиль</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                required
                className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
              >
                {styles.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-[#6f1820] px-4 py-3 font-semibold text-white transition disabled:opacity-40"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#cfc2b2] px-4 py-3 font-semibold text-[#685f55] transition"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
