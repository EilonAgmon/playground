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
  nutsPhotoList(setKey) {
    return request(`/api/nuts/photos/${setKey}`).then((r) =>
      r.ok ? r.json() : { photos: [] }
    );
  },
  nutsPhotoUrl(setKey, filename) {
    return `${API_BASE}/api/nuts/photo/${setKey}/${encodeURIComponent(filename)}`;
  },
  tickers(window = "today") {
    const params = window !== "today" ? `?window=${window}` : "";
    return request(`/api/tickers${params}`).then((r) => (r.ok ? r.json() : { tickers: [] }));
  },
};
