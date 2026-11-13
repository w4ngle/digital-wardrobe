-- Доступ к данным выполняется только сервером после проверки Telegram initData.
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Разрешить всё для outfits" ON outfits;
DROP POLICY IF EXISTS "Allow all for outfits" ON outfits;
DROP POLICY IF EXISTS "Разрешить всё для outfit_items" ON outfit_items;
DROP POLICY IF EXISTS "Allow all for outfit_items" ON outfit_items;

UPDATE storage.buckets SET public = false WHERE id = 'wardrobe-items';
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
