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

function parseUserAgent(ua) {
  ua = ua || "";
  let os = "Unknown";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/CriOS\//.test(ua)) browser = "Chrome (iOS)";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";

  let deviceType = "desktop";
  if (/iPad|Tablet/.test(ua)) deviceType = "tablet";
  else if (/Mobi|iPhone|Android/.test(ua)) deviceType = "mobile";

  return { os, browser, deviceType };
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

async function getSessionToken(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer (.+)$/);
  if (!match) return null;
  const token = match[1];
  const row = await env.DB.prepare(
    "SELECT token FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  )
    .bind(token)
    .first();
  return row ? token : null;
}

async function handleTrackStart(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const cf = request.cf || {};
  const ua = parseUserAgent(request.headers.get("User-Agent"));

  const result = await env.DB.prepare(
    `INSERT INTO plays
      (country, region, city, timezone, latitude, longitude,
       user_agent, browser, os, device_type, referrer, language, screen_w, screen_h)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      cf.country || null,
      cf.region || null,
      cf.city || null,
      cf.timezone || null,
      cf.latitude ? Number(cf.latitude) : null,
      cf.longitude ? Number(cf.longitude) : null,
      request.headers.get("User-Agent") || null,
      ua.browser,
      ua.os,
      ua.deviceType,
      (body.referrer || "").slice(0, 500),
      (body.language || "").slice(0, 20),
      body.screen && body.screen.w ? Number(body.screen.w) : null,
      body.screen && body.screen.h ? Number(body.screen.h) : null
    )
    .run();

  return json({ id: result.meta.last_row_id }, 201, origin);
}

async function handleTrackEnd(request, env, origin, id) {
  const body = await request.json().catch(() => ({}));
  const outcome = body.outcome === "win" || body.outcome === "loss" ? body.outcome : null;

  await env.DB.prepare(
    `UPDATE plays SET ended_at = datetime('now'), outcome = ?, player_score = ?, ai_score = ?
     WHERE id = ?`
  )
    .bind(
      outcome,
      Number.isFinite(body.playerScore) ? body.playerScore : null,
      Number.isFinite(body.aiScore) ? body.aiScore : null,
      id
    )
    .run();

  return json({ ok: true }, 200, origin);
}

async function handleLogin(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  // Small fixed delay to blunt brute-force guessing.
  await new Promise((r) => setTimeout(r, 300));

  if (!env.ADMIN_PASSWORD || !timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    return json({ error: "Invalid password" }, 401, origin);
  }

  const token = await randomToken();
  await env.DB.prepare(
    "INSERT INTO sessions (token, expires_at) VALUES (?, datetime('now', '+7 days'))"
  )
    .bind(token)
    .run();

  return json({ token }, 200, origin);
}

async function handleLogout(request, env, origin) {
  const token = await getSessionToken(request, env);
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  return json({ ok: true }, 200, origin);
}

async function handleFlushPong(request, env, origin) {
  const token = await getSessionToken(request, env);
  if (!token) return json({ error: "Unauthorized" }, 401, origin);
  await env.DB.prepare("DELETE FROM plays").run();
  return json({ ok: true }, 200, origin);
}

async function handleFlushTravel(request, env, origin) {
  const token = await getSessionToken(request, env);
  if (!token) return json({ error: "Unauthorized" }, 401, origin);
  await env.DB.prepare("DELETE FROM travel_items").run();
  return json({ ok: true }, 200, origin);
}

async function handleStats(request, env, origin) {
  const token = await getSessionToken(request, env);
  if (!token) return json({ error: "Unauthorized" }, 401, origin);

  const totals = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total_plays,
       SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) AS wins,
       SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) AS losses,
       SUM(CASE WHEN outcome IS NULL THEN 1 ELSE 0 END) AS abandoned
     FROM plays`
  ).first();

  const byDay = await env.DB.prepare(
    `SELECT date(created_at) AS day, COUNT(*) AS count
     FROM plays GROUP BY day ORDER BY day DESC LIMIT 30`
  ).all();

  const byCountry = await env.DB.prepare(
    `SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS count
     FROM plays GROUP BY country ORDER BY count DESC LIMIT 20`
  ).all();

  const recent = await env.DB.prepare(
    `SELECT id, created_at, ended_at, country, region, city, browser, os, device_type,
            referrer, language, outcome, player_score, ai_score
     FROM plays ORDER BY created_at DESC LIMIT 200`
  ).all();

  return json(
    {
      totals,
      byDay: byDay.results,
      byCountry: byCountry.results,
      recent: recent.results,
    },
    200,
    origin
  );
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

async function handleTickers(env, origin) {
  if (!env.FMP_API_KEY) return json({ error: "Ticker feed not configured" }, 500, origin);

  const cached = await env.DB.prepare("SELECT payload, fetched_at FROM ticker_cache WHERE id = 1").first();
  const now = Date.now();
  const isFresh = cached && now - cached.fetched_at < TICKER_CACHE_TTL_MS;

  if (isFresh) {
    return json({ tickers: JSON.parse(cached.payload), fetchedAt: cached.fetched_at, stale: false }, 200, origin);
  }

  try {
    const tickers = await fetchLosersFromFmp(env.FMP_API_KEY);
    await env.DB.prepare(
      "INSERT INTO ticker_cache (id, payload, fetched_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at"
    )
      .bind(JSON.stringify(tickers), now)
      .run();
    return json({ tickers, fetchedAt: now, stale: false }, 200, origin);
  } catch (err) {
    // Upstream hiccup or quota hit — serve the last known-good snapshot
    // rather than a hard failure, if one exists.
    if (cached) {
      return json({ tickers: JSON.parse(cached.payload), fetchedAt: cached.fetched_at, stale: true }, 200, origin);
    }
    return json({ error: "Ticker feed unavailable", detail: String(err) }, 502, origin);
  }
}

// ---------- Travel: city + attraction search (free, keyless sources) ----------

const TRAVEL_UA = "agmoneilon-travel-app/1.0 (https://agmoneilon.com; agmoneilon@gmail.com)";

function validUsername(u) {
  if (typeof u !== "string") return null;
  const trimmed = u.trim().slice(0, 20);
  return trimmed.length ? trimmed : null;
}

async function handleCitySearch(env, origin, url) {
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ results: [] }, 200, origin);

  const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&accept-language=en&q=${encodeURIComponent(q)}`;
  const res = await fetch(nomUrl, { headers: { "User-Agent": TRAVEL_UA } });
  if (!res.ok) return json({ results: [] }, 200, origin);
  const data = await res.json();

  // Only real administrative places/settlements (excludes shops, restaurants,
  // landuse areas, etc. that happen to share a name with the query).
  const seen = new Set();
  const results = [];
  for (const place of data) {
    if (place.category !== "boundary" && place.category !== "place") continue;
    const addr = place.address || {};
    const name = place.name;
    if (!name || !addr.country) continue;

    const isCountry = place.addresstype === "country";
    const country = isCountry ? null : addr.country;
    const key = isCountry ? `country:${name}` : `${name}|${addr.country}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ city: name, country });
  }

  return json({ results }, 200, origin);
}

async function wikipediaSearch(query) {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&srlimit=5&format=json`;
  const res = await fetch(searchUrl, { headers: { "User-Agent": TRAVEL_UA } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.query && data.query.search) || [];
}

async function wikipediaSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "User-Agent": TRAVEL_UA } });
  if (!res.ok) return null;
  return res.json();
}

async function wikidataOfficialSite(qid) {
  if (!qid) return null;
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const res = await fetch(url, { headers: { "User-Agent": TRAVEL_UA } });
  if (!res.ok) return null;
  const data = await res.json();
  const entity = data.entities && data.entities[qid];
  const claims = entity && entity.claims && entity.claims.P856;
  if (!claims || !claims.length) return null;
  const value = claims[0].mainsnak && claims[0].mainsnak.datavalue && claims[0].mainsnak.datavalue.value;
  return typeof value === "string" ? value : null;
}

async function handleAttractionSearch(env, origin, url) {
  const q = (url.searchParams.get("q") || "").trim();
  const city = (url.searchParams.get("city") || "").trim();
  if (q.length < 2) return json({ results: [] }, 200, origin);

  const searchResults = await wikipediaSearch(city ? `${q} ${city}` : q);
  const summaries = await Promise.all(searchResults.slice(0, 5).map((r) => wikipediaSummary(r.title)));

  const results = await Promise.all(
    summaries.map(async (s) => {
      if (!s || s.type === "disambiguation") return null;
      const officialUrl = await wikidataOfficialSite(s.wikibase_item);
      return {
        title: s.title,
        extract: s.extract || null,
        image: s.thumbnail ? s.thumbnail.source : null,
        officialUrl: officialUrl || null,
        wikipediaUrl: s.content_urls && s.content_urls.desktop ? s.content_urls.desktop.page : null,
      };
    })
  );

  return json({ results: results.filter(Boolean) }, 200, origin);
}

async function handleTravelCitiesSummary(env, origin, url) {
  const username = validUsername(url.searchParams.get("username"));
  if (!username) return json({ error: "username required" }, 400, origin);

  const result = await env.DB.prepare(
    `SELECT city, country, COUNT(*) AS count, MAX(created_at) AS last_added
     FROM travel_items WHERE username = ?
     GROUP BY city, country
     ORDER BY last_added DESC`
  )
    .bind(username)
    .all();

  return json({ cities: result.results }, 200, origin);
}

async function handleTravelItemsList(env, origin, url) {
  const username = validUsername(url.searchParams.get("username"));
  if (!username) return json({ error: "username required" }, 400, origin);
  const city = url.searchParams.get("city");

  let query = "SELECT * FROM travel_items WHERE username = ?";
  const binds = [username];
  if (city) {
    query += " AND city = ?";
    binds.push(city);
  }
  query += " ORDER BY created_at DESC";

  const result = await env.DB.prepare(query)
    .bind(...binds)
    .all();
  return json({ items: result.results }, 200, origin);
}

async function handleTravelItemAdd(request, env, origin) {
  const body = await request.json().catch(() => ({}));
  const username = validUsername(body.username);
  const city = (body.city || "").slice(0, 200);
  const title = (body.title || "").slice(0, 300);
  if (!username || !city || !title) {
    return json({ error: "username, city and title required" }, 400, origin);
  }

  const result = await env.DB.prepare(
    `INSERT INTO travel_items (username, city, country, title, extract, image_url, official_url, wikipedia_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      username,
      city,
      (body.country || "").slice(0, 200) || null,
      title,
      (body.extract || "").slice(0, 2000) || null,
      body.image || null,
      body.officialUrl || null,
      body.wikipediaUrl || null
    )
    .run();

  return json({ id: result.meta.last_row_id }, 201, origin);
}

async function handleTravelItemDelete(env, origin, id, url) {
  const username = validUsername(url.searchParams.get("username"));
  if (!username) return json({ error: "username required" }, 400, origin);

  await env.DB.prepare("DELETE FROM travel_items WHERE id = ? AND username = ?").bind(id, username).run();
  return json({ ok: true }, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      if (request.method === "POST" && url.pathname === "/api/track") {
        return await handleTrackStart(request, env, origin);
      }

      const trackEndMatch = url.pathname.match(/^\/api\/track\/(\d+)$/);
      if (request.method === "PATCH" && trackEndMatch) {
        return await handleTrackEnd(request, env, origin, trackEndMatch[1]);
      }

      if (request.method === "POST" && url.pathname === "/api/login") {
        return await handleLogin(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/api/logout") {
        return await handleLogout(request, env, origin);
      }

      if (request.method === "GET" && url.pathname === "/api/stats") {
        return await handleStats(request, env, origin);
      }

      if (request.method === "GET" && url.pathname === "/api/tickers") {
        return await handleTickers(env, origin);
      }

      if (request.method === "POST" && url.pathname === "/api/admin/flush-pong") {
        return await handleFlushPong(request, env, origin);
      }

      if (request.method === "POST" && url.pathname === "/api/admin/flush-travel") {
        return await handleFlushTravel(request, env, origin);
      }

      if (request.method === "GET" && url.pathname === "/api/travel/cities") {
        return await handleCitySearch(env, origin, url);
      }

      if (request.method === "GET" && url.pathname === "/api/travel/attractions") {
        return await handleAttractionSearch(env, origin, url);
      }

      if (request.method === "GET" && url.pathname === "/api/travel/cities-summary") {
        return await handleTravelCitiesSummary(env, origin, url);
      }

      if (request.method === "GET" && url.pathname === "/api/travel/items") {
        return await handleTravelItemsList(env, origin, url);
      }

      if (request.method === "POST" && url.pathname === "/api/travel/items") {
        return await handleTravelItemAdd(request, env, origin);
      }

      const travelDeleteMatch = url.pathname.match(/^\/api\/travel\/items\/(\d+)$/);
      if (request.method === "DELETE" && travelDeleteMatch) {
        return await handleTravelItemDelete(env, origin, travelDeleteMatch[1], url);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err) {
      return json({ error: "Internal error", detail: String(err) }, 500, origin);
    }
  },
};
