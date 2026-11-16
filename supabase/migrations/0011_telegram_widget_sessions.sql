CREATE TABLE IF NOT EXISTS telegram_widget_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_ids UUID[] NOT NULL,
  request JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'worn', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE telegram_widget_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS telegram_widget_sessions_created_at_idx ON telegram_widget_sessions(created_at DESC);

NOTIFY pgrst, 'reload schema';
