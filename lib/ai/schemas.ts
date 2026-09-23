import { z } from 'zod'
import { CATEGORIES, SEASONS, STYLES } from '@/lib/taxonomy'

// Схема ответа AI при анализе фото вещи (версия 2)
export const ItemAnalysisSchema = z.object({
  category: z.enum(CATEGORIES),
  color: z.string().min(2).max(30),
  season: z.enum(SEASONS),
  style: z.enum(STYLES),
  warmth: z.number().int().min(1).max(5), // 1 — очень лёгкая, 5 — очень тёплая
  formality: z.number().int().min(1).max(5), // 1 — спорт/дом, 5 — строгий дресс-код
  description: z.string().min(5).max(200), // краткое описание вещи
  confidence: z.number().min(0).max(1), // уверенность модели в результате
})

export type ItemAnalysis = z.infer<typeof ItemAnalysisSchema>

// Схема ответа AI при подборе образа
export const OutfitRecommendationSchema = z.object({
  title: z.string().min(3).max(100), // название образа
  reasoning: z.string().min(10).max(500), // объяснение выбора
  item_numbers: z.array(z.number().int().positive()).min(1).max(10), // номера вещей из каталога
  missing_note: z.string().max(200).nullable().optional(), // если чего-то не хватает
})

export type OutfitRecommendation = z.infer<typeof OutfitRecommendationSchema>
