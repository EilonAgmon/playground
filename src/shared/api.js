export const API_BASE = "https://pong-backoffice.agmoneilon.workers.dev";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  return res;
}

export const api = {
  trackStart(body) {
    return request("/api/track", { method: "POST", body: JSON.stringify(body) }).then((r) =>
      r.ok ? r.json() : null
    );
  },
  trackEnd(id, body) {
    return request(`/api/track/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  login(password) {
    return request("/api/login", { method: "POST", body: JSON.stringify({ password }) });
  },
  logout(token) {
    return request("/api/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  },
  flushPong(token) {
    return request("/api/admin/flush-pong", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  },
  stats(token) {
    return request("/api/stats", { headers: { Authorization: `Bearer ${token}` } });
  },
  tickers() {
    return request("/api/tickers").then((r) => (r.ok ? r.json() : { tickers: [] }));
  },
};
