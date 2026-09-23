-- Создать таблицу outfit_items если её нет
CREATE TABLE IF NOT EXISTS outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включить RLS
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;

-- Удалить старые политики
DROP POLICY IF EXISTS "Разрешить всё для outfits" ON outfits;
DROP POLICY IF EXISTS "Разрешить всё для outfit_items" ON outfit_items;

-- Создать новые политики
CREATE POLICY "Allow all for outfits"
ON outfits FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for outfit_items"
ON outfit_items FOR ALL
TO public
USING (true)
WITH CHECK (true);
