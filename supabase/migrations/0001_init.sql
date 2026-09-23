-- Initial schema for digital wardrobe
-- Merged from: supabase-schema.sql, supabase-outfits.sql, supabase-storage.sql

-- Таблица вещей гардероба
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_url TEXT,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  season TEXT NOT NULL,
  style TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица образов
CREATE TABLE IF NOT EXISTS outfits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  occasion TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Связь образ-вещь (many-to-many)
CREATE TABLE IF NOT EXISTS outfit_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для ускорения поиска
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_season ON items(season);
CREATE INDEX IF NOT EXISTS idx_items_style ON items(style);

-- RLS политики для outfits
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Разрешить всё для outfits" ON outfits;
CREATE POLICY "Разрешить всё для outfits"
ON outfits FOR ALL
USING (true)
WITH CHECK (true);

-- RLS политики для outfit_items
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Разрешить всё для outfit_items" ON outfit_items;
CREATE POLICY "Разрешить всё для outfit_items"
ON outfit_items FOR ALL
USING (true)
WITH CHECK (true);

-- Storage bucket для фотографий вещей
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe-items', 'wardrobe-items', true)
ON CONFLICT (id) DO NOTHING;

-- Storage политики
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'wardrobe-items');

DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wardrobe-items');

DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'wardrobe-items');
