ALTER TABLE outfits
  ADD COLUMN IF NOT EXISTS suggested_by TEXT
  CHECK (suggested_by IN ('owner', 'partner'));

NOTIFY pgrst, 'reload schema';
