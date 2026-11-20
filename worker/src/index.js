const ALLOWED_ORIGINS = [
  "https://agmoneilon.com",
  "https://www.agmoneilon.com",
  "https://eilonagmon.github.io",
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  return false;
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

async function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isValidNutsToken(token, env) {
  if (!token) return false;
  const row = await env.DB.prepare(
    "SELECT token FROM nuts_sessions WHERE token = ? AND expires_at > datetime('now')"
  )
    .bind(token)
    .first();
  return !!row;
}

async function getNutsSessionToken(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer (.+)$/);
  const token = match ? match[1] : null;
  return (await isValidNutsToken(token, env)) ? token : null;
}

// setKey scopes a photo set within the shared bucket by R2 key prefix
// (e.g. "early-pictures/"), so future nuts_b_day apps can each get their
// own set without a new bucket or binding.
async function handleNutsPhotoList(request, env, origin, setKey) {
  const token = await getNutsSessionToken(request, env);
  if (!token) return json({ error: "Unauthorized" }, 401, origin);

  const rows = await env.DB.prepare("SELECT filename FROM nuts_photos WHERE set_key = ? ORDER BY filename")
    .bind(setKey)
    .all();
  const photos = rows.results.map((r) => r.filename);
  return json({ photos }, 200, origin);
}

// <img src> can't send an Authorization header, so this one takes the
// token as a query param instead — validated the same way either path.
async function handleNutsPhotoGet(request, env, origin, setKey, filename) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!(await isValidNutsToken(token, env))) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders(origin) });
  }

  const row = await env.DB.prepare(
    "SELECT content_type, data FROM nuts_photos WHERE set_key = ? AND filename = ?"
  )
    .bind(setKey, filename)
    .first();
  if (!row) return new Response("Not found", { status: 404, headers: corsHeaders(origin) });

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.content_type || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      ...corsHeaders(origin),
    },
  });
}

async function handleNutsLogin(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  // Small fixed delay to blunt brute-force guessing.
  await new Promise((r) => setTimeout(r, 300));

  if (!env.NUTS_PASSWORD || !timingSafeEqual(password, env.NUTS_PASSWORD)) {
    return json({ error: "Invalid password" }, 401, origin);
  }

  const token = await randomToken();
  await env.DB.prepare(
    "INSERT INTO nuts_sessions (token, expires_at) VALUES (?, datetime('now', '+180 days'))"
  )
    .bind(token)
    .run();

  return json({ token }, 200, origin);
}

// ---------- Tickers: NYSE + NASDAQ biggest-losers, categorized by name keywords ----------

// FMP's free-tier movers endpoint doesn't return a sector field (confirmed
// against a live response), and a static ticker→category map would mostly
// miss anyway — the daily "biggest losers" list skews toward obscure small
// caps, not household names. Matching keywords in the company name instead
// generalizes to whatever shows up on a given day. Order matters: first
// match wins, so more specific categories are listed before generic ones.
const CATEGORY_KEYWORDS = [
  { category: "Health", words: ["therapeutic", "pharma", "bio", "health", "medical", "medicine", "oncology", "diagnostic", "clinical", "life sciences"] },
  { category: "Gaming", words: ["gaming", "games", "esports", "entertainment", "casino", "interactive"] },
  { category: "Tech", words: ["software", "technolog", "robotic", "cyber", "data", "digital", "semiconductor", "artificial intelligence", " ai ", "cloud", "network", "wireless", "internet"] },
  { category: "Energy", words: ["energy", "oil", "gas", "solar", "power", "petroleum", "renewable"] },
  { category: "Finance", words: ["bank", "capital", "financial", "insurance", "holdings", "credit", "investment"] },
  { category: "Materials", words: ["mining", "metals", "minerals", "resources", "chemical"] },
  { category: "Consumer", words: ["retail", "foods", "beverage", "brands", "restaurant", "apparel", "consumer"] },
  { category: "Industrial", words: ["industrial", "manufactur", "aerospace", "defense", "systems", "engineering"] },
];

function categorize(name) {
  const lower = ` ${(name || "").toLowerCase()} `;
  for (const { category, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return category;
  }
  return "Other";
}

// Single-stock/leveraged ETFs (e.g. "Daily Target 2X Long HIMS ETF") ride
// an underlying stock's move by design, not because the business is
// actually declining — they crowd out real "losers" with pure noise.
const LEVERAGED_WORDS = ["leveraged", "inverse", "daily target", "ultrashort", "direxion", "graniteshares", "single stock"];
const LEVERAGED_MULTIPLIER = /\b\d+(\.\d+)?x\b/;

function isLeveragedProduct(name) {
  const lower = (name || "").toLowerCase();
  return LEVERAGED_MULTIPLIER.test(lower) || LEVERAGED_WORDS.some((w) => lower.includes(w));
}

const TICKER_CACHE_TTL_MS = 12000;

async function fetchLosersFromFmp(apiKey) {
  const res = await fetch(`https://financialmodelingprep.com/stable/biggest-losers?apikey=${apiKey}`);
  if (!res.ok) throw new Error(`FMP responded ${res.status}`);
  const data = await res.json();
  return data
    .filter((row) => (row.exchange === "NYSE" || row.exchange === "NASDAQ") && !isLeveragedProduct(row.name))
    .sort((a, b) => a.changesPercentage - b.changesPercentage)
    .slice(0, 20)
    .map((row) => ({
      symbol: row.symbol,
      name: row.name,
      price: row.price,
      change: row.change,
      changesPercentage: row.changesPercentage,
      category: categorize(row.name),
    }));
}

// FMP's free tier has no "as of N days ago" parameter on this endpoint —
// it only ever returns today's snapshot. So 48h/week views can't be
// fetched retroactively; instead, every live "today" refresh also upserts
// today's row here, and the window views are built by aggregating however
// many of these daily rows have accumulated so far (see getWindowedTickers).
function todayKeyEastern(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(date);
}

// The "week" view is the longest lookback anywhere in this app, so nothing
// past 14 days (a buffer beyond that 7) is ever read. Pruning on every
// write keeps this table at a small constant size forever instead of
// growing unbounded — it costs one cheap DELETE, at most once per TTL
// refresh, so effectively free.
async function upsertDailySnapshot(env, tickers) {
  const dateKey = todayKeyEastern();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO ticker_daily_snapshot (date, payload, captured_at) VALUES (?, ?, ?) ON CONFLICT(date) DO UPDATE SET payload = excluded.payload, captured_at = excluded.captured_at"
    ).bind(dateKey, JSON.stringify(tickers), Date.now()),
    env.DB.prepare("DELETE FROM ticker_daily_snapshot WHERE date < date('now', '-14 days')"),
  ]);
}

async function getTodayTickers(env) {
  const cached = await env.DB.prepare("SELECT payload, fetched_at FROM ticker_cache WHERE id = 1").first();
  const now = Date.now();
  const isFresh = cached && now - cached.fetched_at < TICKER_CACHE_TTL_MS;

  if (isFresh) {
    return { tickers: JSON.parse(cached.payload), fetchedAt: cached.fetched_at, stale: false };
  }

  try {
    const tickers = await fetchLosersFromFmp(env.FMP_API_KEY);
    await env.DB.prepare(
      "INSERT INTO ticker_cache (id, payload, fetched_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at"
    )
      .bind(JSON.stringify(tickers), now)
      .run();
    await upsertDailySnapshot(env, tickers);
    return { tickers, fetchedAt: now, stale: false };
  } catch (err) {
    // Upstream hiccup or quota hit — serve the last known-good snapshot
    // rather than a hard failure, if one exists.
    if (cached) {
      return { tickers: JSON.parse(cached.payload), fetchedAt: cached.fetched_at, stale: true };
    }
    throw err;
  }
}

// Merges up to `days` daily snapshots into one "worst decline in this
// window" list. For a symbol seen on more than one distinct day, the
// change shown is computed from its price on the earliest day it appeared
// to its price on the most recent — a real cumulative move, not just
// re-showing a single day's % change. Symbols seen only once fall back to
// that day's own change. `daysSeen` tells the client how many distinct
// days each symbol was actually flagged, and `daysAvailable` tells it how
// much history exists yet at all (relevant right after this shipped).
async function getWindowedTickers(env, days) {
  const rows = await env.DB.prepare(
    "SELECT date, payload, captured_at FROM ticker_daily_snapshot ORDER BY date DESC LIMIT ?"
  )
    .bind(days)
    .all();
  const results = rows.results || [];

  const bySymbol = new Map();
  // Oldest-first so the first pass through each symbol is its earliest
  // appearance in the window, and the last pass is its most recent.
  for (const row of [...results].reverse()) {
    const dayTickers = JSON.parse(row.payload);
    for (const t of dayTickers) {
      const entry = bySymbol.get(t.symbol) || { first: t, dates: [] };
      entry.last = t;
      entry.dates.push(row.date);
      bySymbol.set(t.symbol, entry);
    }
  }

  const merged = Array.from(bySymbol.values()).map(({ first, last, dates }) => {
    const daysSeen = new Set(dates).size;
    const changesPercentage =
      daysSeen > 1 && first.price ? ((last.price - first.price) / first.price) * 100 : last.changesPercentage;
    return {
      symbol: last.symbol,
      name: last.name,
      category: last.category,
      price: last.price,
      changesPercentage,
      daysSeen,
    };
  });

  merged.sort((a, b) => a.changesPercentage - b.changesPercentage);
  return {
    tickers: merged.slice(0, 20),
    daysAvailable: results.length,
    fetchedAt: results[0] ? results[0].captured_at : null,
  };
}

async function handleTickers(env, origin, window) {
  if (!env.FMP_API_KEY) return json({ error: "Ticker feed not configured" }, 500, origin);

  try {
    if (window === "48h" || window === "week") {
      const data = await getWindowedTickers(env, window === "48h" ? 2 : 7);
      return json({ ...data, window, stale: false }, 200, origin);
    }
    const data = await getTodayTickers(env);
    return json({ ...data, window: "today", daysAvailable: null }, 200, origin);
  } catch (err) {
    return json({ error: "Ticker feed unavailable", detail: String(err) }, 502, origin);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      if (request.method === "POST" && url.pathname === "/api/nuts-login") {
        return await handleNutsLogin(request, env, origin);
      }

      const nutsPhotoListMatch = url.pathname.match(/^\/api\/nuts\/photos\/([a-z0-9-]+)$/);
      if (request.method === "GET" && nutsPhotoListMatch) {
        return await handleNutsPhotoList(request, env, origin, nutsPhotoListMatch[1]);
      }

      const nutsPhotoGetMatch = url.pathname.match(/^\/api\/nuts\/photo\/([a-z0-9-]+)\/(.+)$/);
      if (request.method === "GET" && nutsPhotoGetMatch) {
        return await handleNutsPhotoGet(
          request,
          env,
          origin,
          nutsPhotoGetMatch[1],
          decodeURIComponent(nutsPhotoGetMatch[2])
        );
      }

      if (request.method === "GET" && url.pathname === "/api/tickers") {
        const window = url.searchParams.get("window");
        return await handleTickers(env, origin, window === "48h" || window === "week" ? window : "today");
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err) {
      return json({ error: "Internal error", detail: String(err) }, 500, origin);
    }
  },
};
