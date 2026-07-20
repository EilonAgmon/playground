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
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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

      return json({ error: "Not found" }, 404, origin);
    } catch (err) {
      return json({ error: "Internal error", detail: String(err) }, 500, origin);
    }
  },
};
