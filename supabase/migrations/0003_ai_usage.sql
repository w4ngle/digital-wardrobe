-- Миграция: таблица для учёта использования AI
-- Отслеживание затрат и контроль лимитов

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation TEXT NOT NULL, -- 'analyze_photo' | 'recommend_outfit' | 'render_image' | 'embed'
  model TEXT NOT NULL,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для аналитики
CREATE INDEX IF NOT EXISTS ai_usage_operation_idx ON ai_usage(operation);
CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx ON ai_usage(created_at DESC);

-- Функция для подсчёта дневного использования
CREATE OR REPLACE FUNCTION get_daily_ai_usage(p_operation TEXT DEFAULT NULL)
RETURNS TABLE (
  operation TEXT,
  count BIGINT,
  total_tokens BIGINT,
  total_cost_usd DECIMAL
)
LANGUAGE sql STABLE
AS $$
  SELECT
    operation,
    COUNT(*) as count,
    SUM(tokens_in + tokens_out) as total_tokens,
    SUM(cost_usd) as total_cost_usd
  FROM ai_usage
  WHERE created_at >= CURRENT_DATE
    AND (p_operation IS NULL OR operation = p_operation)
  GROUP BY operation;
$$;

-- RLS политики (открытый доступ, как у items)
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Разрешить всё для ai_usage" ON ai_usage;
CREATE POLICY "Разрешить всё для ai_usage"
ON ai_usage FOR ALL
USING (true)
WITH CHECK (true);
