-- Таблица образов
CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  occasion TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Связь образ-вещь (many-to-many)
CREATE TABLE outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Политики для outfits
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Разрешить всё для outfits"
ON outfits FOR ALL
USING (true)
WITH CHECK (true);

-- Политики для outfit_items
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Разрешить всё для outfit_items"
ON outfit_items FOR ALL
USING (true)
WITH CHECK (true);
