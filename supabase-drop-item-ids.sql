-- Удалить колонку item_ids (используем связь через outfit_items)
ALTER TABLE outfits DROP COLUMN IF EXISTS item_ids;
