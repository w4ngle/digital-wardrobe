-- Удалить старые политики
DROP POLICY IF EXISTS "Разрешить всё для outfits" ON outfits;
DROP POLICY IF EXISTS "Разрешить всё для outfit_items" ON outfit_items;

-- Создать новые политики без ограничений
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
