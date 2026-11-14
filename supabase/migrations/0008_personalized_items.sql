ALTER TABLE items
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS custom_name TEXT,
  ADD COLUMN IF NOT EXISTS fit TEXT CHECK (fit IN ('Облегающая', 'По фигуре', 'Обычная', 'Свободная', 'Оверсайз')),
  ADD COLUMN IF NOT EXISTS length TEXT,
  ADD COLUMN IF NOT EXISTS pattern TEXT,
  ADD COLUMN IF NOT EXISTS layer_role TEXT,
  ADD COLUMN IF NOT EXISTS comfort SMALLINT CHECK (comfort BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS confidence SMALLINT CHECK (confidence BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS needs_underlayer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rain_safe BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS snoozed_until DATE,
  ADD COLUMN IF NOT EXISTS laundry_return_at TIMESTAMPTZ;

ALTER TABLE outfits
  ADD COLUMN IF NOT EXISTS feedback_reasons TEXT[] NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
