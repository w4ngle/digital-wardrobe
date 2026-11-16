-- Все фотографии гардероба должны выдаваться только по временным подписанным ссылкам.
UPDATE storage.buckets
SET public = false
WHERE id IN ('wardrobe-items', 'wardrobe-photos');
