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
  stats(token) {
    return request("/api/stats", { headers: { Authorization: `Bearer ${token}` } });
  },
  searchCities(q) {
    return request(`/api/travel/cities?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : { results: [] }));
  },
  searchAttractions(q, city) {
    const params = new URLSearchParams({ q, city: city || "" });
    return request(`/api/travel/attractions?${params}`).then((r) => (r.ok ? r.json() : { results: [] }));
  },
  listTravelItems(username, city) {
    const params = new URLSearchParams({ username, city: city || "" });
    return request(`/api/travel/items?${params}`).then((r) => (r.ok ? r.json() : { items: [] }));
  },
  addTravelItem(item) {
    return request("/api/travel/items", { method: "POST", body: JSON.stringify(item) }).then((r) =>
      r.ok ? r.json() : null
    );
  },
  deleteTravelItem(id, username) {
    const params = new URLSearchParams({ username });
    return request(`/api/travel/items/${id}?${params}`, { method: "DELETE" });
  },
};
