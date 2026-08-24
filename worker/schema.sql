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

-- Single-row stale-while-revalidate cache for the /api/tickers endpoint.
-- Keeps FMP's free-tier 250 req/day comfortably out of reach: the Worker
-- only calls upstream when this row is older than the TTL, so usage scales
-- with real site traffic instead of wall-clock time.
CREATE TABLE IF NOT EXISTS ticker_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);

-- Same stale-while-revalidate pattern for /api/jobs. Job postings don't
-- need minute-by-minute freshness, so this one refreshes on a much longer
-- TTL (see JOB_CACHE_TTL_MS) than the ticker cache.
CREATE TABLE IF NOT EXISTS job_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);
