-- Миграция: добавление AI-полей к вещам
-- Расширение для векторного поиска и новые поля для улучшенного анализа

-- Включаем расширение pgvector для семантического поиска
CREATE EXTENSION IF NOT EXISTS vector;

-- Добавляем AI-поля к таблице items
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS warmth SMALLINT CHECK (warmth BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS formality SMALLINT CHECK (formality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS ai_meta JSONB,
  ADD COLUMN IF NOT EXISTS embedding vector(1536); -- размерность text-embedding-3-small

-- Индекс для векторного поиска (HNSW — быстрый approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS items_embedding_idx
  ON items USING hnsw (embedding vector_cosine_ops);

-- Добавляем поля к таблице outfits для отслеживания источника
ALTER TABLE outfits
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual', -- 'ai' | 'fallback' | 'manual'
  ADD COLUMN IF NOT EXISTS prompt TEXT, -- запрос пользователя
  ADD COLUMN IF NOT EXISTS reasoning TEXT, -- объяснение AI
  ADD COLUMN IF NOT EXISTS render_url TEXT; -- URL сгенерированной картинки

-- Функция для семантического поиска вещей
CREATE OR REPLACE FUNCTION match_items(
  query_embedding vector(1536),
  match_count INT DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  description TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    i.id,
    i.category,
    i.description,
    1 - (i.embedding <=> query_embedding) AS similarity
  FROM items i
  WHERE i.embedding IS NOT NULL
    AND (p_category IS NULL OR i.category = p_category)
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
$$;
