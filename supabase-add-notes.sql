-- Добавление колонки notes в таблицу outfits
ALTER TABLE outfits ADD COLUMN IF NOT EXISTS notes TEXT;
