# Цифровой гардероб

Личное веб-приложение для управления гардеробом и создания образов с помощью AI.

## Установка и запуск

1. Установите зависимости:
```bash
npm install
```

2. Настройте Supabase:
   - Создайте проект на [supabase.com](https://supabase.com)
   - Выполните SQL из файла `supabase/migrations/0001_init.sql` в SQL Editor
   - Скопируйте URL проекта и Anon Key

3. Создайте файл `.env.local` на основе `.env.example`:
```bash
cp .env.example .env.local
```

Заполните переменные окружения:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

4. Запустите приложение:
```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## Текущий статус

**Виток 0 — Стабилизация:** ✅ В процессе
- ✅ Зависимости установлены (`openai`, `zod`, `vitest`)
- ✅ Миграции объединены в `supabase/migrations/0001_init.sql`
- ✅ `.env.example` создан
- ✅ `.gitignore` обновлён
- ✅ Документация (`docs/PLAN.md`, `docs/AGENT_BRIEF.md`)
- ⏳ README обновляется
- ⏳ Проверка сборки

**Завершённые функции:**
- Базовый каркас Next.js с TypeScript
- Подключение к Supabase
- Модель данных (items, outfits, outfit_items)
- Список всех вещей гардероба с фильтрами
- Добавление/редактирование/удаление вещей
- Загрузка и хранение фотографий
- Автоматический анализ фото через AI (GPT-4o-mini)
- Создание и сохранение образов
- Подбор образов (правила, без AI)

**Следующие витки:**
- Виток 1: Улучшенное описание вещи с AI (warmth, formality, description, confidence)
- Виток 2: AI-подбор образов по текстовому запросу
- Виток 3: Семантический поиск, погода, коллаж образа
- Виток 4: Дизайн-система, auth/RLS, деплой, demo-режим

Подробный план: `docs/PLAN.md`

## Стек

- **Next.js 16.3.5** (App Router) + React 19
- TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL + Storage + Auth)
- OpenAI API (GPT-4o-mini для vision и текста)
- Vitest (тестирование)

## Архитектура

- `app/` — страницы и API-роуты (Next.js App Router)
- `components/` — React компоненты
- `lib/` — утилиты, типы, Supabase клиент
- `supabase/migrations/` — SQL миграции
- `docs/` — документация и план разработки
- `eval/` — golden set для оценки качества AI

## Разработка

```bash
# Сборка
npm run build

# Линтинг
npm run lint

# Тесты
npm test

# Проверка типов
npm run typecheck
```

## Лицензия

Личный некоммерческий проект.
