-- Таблица вещей гардероба
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_url TEXT,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  season TEXT NOT NULL,
  style TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица образов
CREATE TABLE outfits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  occasion TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для ускорения поиска
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_season ON items(season);
CREATE INDEX idx_items_style ON items(style);
