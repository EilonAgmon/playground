export const API_BASE = "https://pong-backoffice.agmoneilon.workers.dev";

const REQUEST_TIMEOUT_MS = 10000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      signal: controller.signal,
      ...options,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  nutsLogin(password) {
    return request("/api/nuts-login", { method: "POST", body: JSON.stringify({ password }) });
  },
  nutsPhotoList(setKey, token) {
    return request(`/api/nuts/photos/${setKey}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
      r.ok ? r.json() : { photos: [] }
    );
  },
  nutsPhotoUrl(setKey, filename, token) {
    return `${API_BASE}/api/nuts/photo/${setKey}/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  },
  tickers(window = "today") {
    const params = window !== "today" ? `?window=${window}` : "";
    return request(`/api/tickers${params}`).then((r) => (r.ok ? r.json() : { tickers: [] }));
  },
};
