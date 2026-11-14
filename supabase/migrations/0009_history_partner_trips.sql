ALTER TABLE items
  ADD COLUMN IF NOT EXISTS wears_since_wash INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unavailable_reason TEXT;

CREATE TABLE IF NOT EXISTS wear_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  worn_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  laundry_decision TEXT CHECK (laundry_decision IN ('keep', 'laundry'))
);

ALTER TABLE outfits
  ADD COLUMN IF NOT EXISTS suggested_by_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_message TEXT,
  ADD COLUMN IF NOT EXISTS proposal_status TEXT NOT NULL DEFAULT 'saved'
    CHECK (proposal_status IN ('saved', 'pending', 'accepted', 'declined', 'will_wear')),
  ADD COLUMN IF NOT EXISTS owner_reaction TEXT;

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  packed_item_ids UUID[] NOT NULL DEFAULT '{}',
  checklist JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wear_history_item_worn_at_idx ON wear_history(item_id, worn_at DESC);
NOTIFY pgrst, 'reload schema';
