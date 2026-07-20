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
