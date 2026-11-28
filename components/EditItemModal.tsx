'use client'

import { useEffect, useState } from 'react'
import { Item } from '@/lib/supabase'
import { uploadPhoto } from '@/lib/api'
import { Camera, ImageSquare, X } from '@phosphor-icons/react'
import { removeImageBackground } from '@/lib/background-removal'
import { compressImage } from '@/lib/client-image'
import FastImage from '@/components/FastImage'
import { CATEGORIES, FITS, LAYER_ROLES, LENGTHS, PATTERNS, SEASONS, STYLES, SUBCATEGORIES, supportsFit, supportsLength, supportsSeason, supportsWarmth } from '@/lib/taxonomy'

type EditItemModalProps = {
  item: Item
  onSave: (id: string, data: Partial<Omit<Item, 'id' | 'created_at'>>) => Promise<void>
  onClose: () => void
}

export default function EditItemModal({ item, onSave, onClose }: EditItemModalProps) {
  const [category, setCategory] = useState(item.category)
  const [color, setColor] = useState(item.color)
  const [season, setSeason] = useState(item.season)
  const [style, setStyle] = useState(item.style)
  const [subcategory, setSubcategory] = useState(item.subcategory || '')
  const [customName, setCustomName] = useState(item.custom_name || '')
  const [fit, setFit] = useState(item.fit || 'Обычная')
  const [length, setLength] = useState(item.length || '')
  const [pattern, setPattern] = useState(item.pattern || 'Однотонная')
  const [layerRole, setLayerRole] = useState(item.layer_role || 'Базовый слой')
  const [comfort, setComfort] = useState(item.comfort ?? 3)
  const [confidence, setConfidence] = useState(item.confidence ?? 3)
  const [warmth, setWarmth] = useState(item.warmth ?? 3)
  const [formality, setFormality] = useState(item.formality ?? 3)
  const [needsUnderlayer, setNeedsUnderlayer] = useState(Boolean(item.needs_underlayer))
  const [rainSafe, setRainSafe] = useState(Boolean(item.rain_safe))
  const [trainingSuitable, setTrainingSuitable] = useState(Boolean(item.training_suitable || item.ai_meta?.training_suitable))
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(item.photo_url)
  const [loading, setLoading] = useState(false)
  const [removingBackground, setRemovingBackground] = useState(false)
  const [backgroundProgress, setBackgroundProgress] = useState(0)

  useEffect(() => () => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const compressed = await compressImage(file)
        setPhotoFile(compressed)
        setPhotoPreview(URL.createObjectURL(compressed))
      } catch {
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
      }
    }
  }

  const handleRemoveBackground = async () => {
    if (!photoFile) return
    setRemovingBackground(true)
    try {
      const processed = await removeImageBackground(photoFile, setBackgroundProgress)
      setPhotoFile(processed)
      setPhotoPreview(URL.createObjectURL(processed))
    } catch (error) {
      console.error('Ошибка удаления фона:', error)
      alert('Не удалось убрать фон. Можно сохранить исходное фото.')
    } finally {
      setRemovingBackground(false)
      setBackgroundProgress(0)
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
      await onSave(item.id, {
        category, color, season: supportsSeason(category) ? season : 'Всесезонное', style, photo_url: photoUrl,
        subcategory: subcategory || null,
        custom_name: customName.trim() || null,
        fit: supportsFit(category) ? fit : null, length: supportsLength(category, subcategory) ? length || null : null, pattern, layer_role: layerRole,
        warmth: supportsWarmth(category) && !Number.isNaN(warmth) ? warmth : null, formality,
        comfort, confidence, needs_underlayer: needsUnderlayer, rain_safe: rainSafe, ai_meta: { ...(item.ai_meta || {}), training_suitable: trainingSuitable || style === 'Спортивный' },
      })
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
                  <FastImage src={photoPreview} alt="Превью" className="h-full w-full rounded-xl border border-[#dfd4c4] object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f422f] px-3 py-3 text-sm font-semibold text-white"><Camera size={18} aria-hidden />Сделать<input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="sr-only" /></label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfc2b2] px-3 py-3 text-sm font-semibold text-[#1f422f]"><ImageSquare size={18} aria-hidden />Из галереи<input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" /></label>
              </div>
              {photoFile && <button type="button" onClick={handleRemoveBackground} disabled={removingBackground} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-2.5 text-sm font-semibold text-[#1f422f] disabled:opacity-50">{removingBackground ? `Подготавливаю${backgroundProgress ? ` ${Math.round(backgroundProgress * 100)}%` : '…'}` : 'Убрать фон'}</button>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e3026]">Категория</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setSubcategory(''); if (!supportsSeason(e.target.value)) setSeason('Всесезонное') }}
                required
                className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div><label className="mb-2 block text-sm font-semibold text-[#1e3026]">Тип вещи</label><select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3"><option value="">Выберите тип</option>{SUBCATEGORIES[category as keyof typeof SUBCATEGORIES]?.map((option) => <option key={option}>{option}</option>)}</select></div>

            <div><label className="mb-2 block text-sm font-semibold text-[#1e3026]">Своё название</label><input value={customName} onChange={(e) => setCustomName(e.target.value)} maxLength={80} className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3" /></div>

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

            {supportsSeason(category) && <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e3026]">Сезон</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                required
                className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
              >
                {SEASONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>}

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1e3026]">Стиль</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                required
                className="w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 text-[#1e3026]"
              >
                {STYLES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className={`grid gap-3 ${supportsFit(category) ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {supportsFit(category) && <label className="text-sm font-semibold">Посадка<select value={fit} onChange={(e) => setFit(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal">{FITS.map((value) => <option key={value}>{value}</option>)}</select></label>}
              <label className="text-sm font-semibold">Принт / фактура<select value={pattern} onChange={(e) => setPattern(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal">{PATTERNS.map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>
            {supportsLength(category, subcategory) && <label className="block text-sm font-semibold">Длина<select value={length} onChange={(e) => setLength(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal"><option value="">Не указывать</option>{LENGTHS.map((value) => <option key={value}>{value}</option>)}</select></label>}
            {category === 'Верх' && <label className="block text-sm font-semibold">Роль в образе<select value={layerRole} onChange={(e) => setLayerRole(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal">{LAYER_ROLES.map((value) => <option key={value}>{value}</option>)}</select></label>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">Комфорт (1–5)<input type="number" min="1" max="5" required value={Number.isNaN(comfort) ? '' : comfort} onChange={(e) => setComfort(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal" /></label>
              <label className="text-sm font-semibold">Уверенность (1–5)<input type="number" min="1" max="5" required value={Number.isNaN(confidence) ? '' : confidence} onChange={(e) => setConfidence(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal" /></label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{supportsWarmth(category) && <label className="text-sm font-semibold">Теплота (1–5)<input type="number" min="1" max="5" value={Number.isNaN(warmth) ? '' : warmth} onChange={(e) => setWarmth(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal" /></label>}<label className="text-sm font-semibold">Формальность (1–5)<input type="number" min="1" max="5" required value={Number.isNaN(formality) ? '' : formality} onChange={(e) => setFormality(e.target.value === '' ? Number.NaN : e.target.valueAsNumber)} className="mt-2 w-full rounded-xl border border-[#cfc2b2] bg-white px-3 py-3 font-normal" /></label></div>
            <div className="space-y-3 rounded-2xl bg-[#f3ede4] p-4">
              <label className="flex items-start gap-3 text-sm leading-5"><input type="checkbox" checked={needsUnderlayer} onChange={(e) => setNeedsUnderlayer(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" /><span>Нужен особый нижний слой</span></label>
              {(category === 'Обувь' || category === 'Верхняя одежда') && <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={rainSafe} onChange={(e) => setRainSafe(e.target.checked)} className="h-5 w-5" />Подходит для дождя</label>}
              {['Верх', 'Низ', 'Комплект', 'Обувь', 'Верхняя одежда'].includes(category) && <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={trainingSuitable} onChange={(e) => setTrainingSuitable(e.target.checked)} className="h-5 w-5" />Подходит для тренировки</label>}
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
