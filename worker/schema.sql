CREATE TABLE IF NOT EXISTS plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  timezone TEXT,
  latitude REAL,
  longitude REAL,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,
  referrer TEXT,
  language TEXT,
  screen_w INTEGER,
  screen_h INTEGER,
  outcome TEXT,
  player_score INTEGER,
  ai_score INTEGER
);

CREATE INDEX IF NOT EXISTS idx_plays_created_at ON plays (created_at);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS travel_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT,
  title TEXT NOT NULL,
  extract TEXT,
  image_url TEXT,
  official_url TEXT,
  wikipedia_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_travel_items_username_city ON travel_items (username, city);
