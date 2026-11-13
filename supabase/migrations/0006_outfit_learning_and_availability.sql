ALTER TABLE items
  ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'available'
  CHECK (availability IN ('available', 'laundry', 'unavailable'));

ALTER TABLE outfits
  ADD COLUMN IF NOT EXISTS rating SMALLINT
  CHECK (rating IN (-1, 1));

NOTIFY pgrst, 'reload schema';
