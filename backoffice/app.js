(() => {
  "use strict";

  const API_BASE = "https://pong-backoffice.agmoneilon.workers.dev";
  const TOKEN_KEY = "pong_backoffice_token";

  const loginScreen = document.getElementById("loginScreen");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const passwordInput = document.getElementById("password");
  const logoutBtn = document.getElementById("logoutBtn");

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function showLogin() {
    loginScreen.classList.remove("hidden");
    dashboard.classList.add("hidden");
  }

  function showDashboard() {
    loginScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
  }

  async function login(password) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error("bad password");
    const data = await res.json();
    setToken(data.token);
  }

  async function fetchStats() {
    const res = await fetch(`${API_BASE}/api/stats`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 401) {
      clearToken();
      showLogin();
      return null;
    }
    if (!res.ok) throw new Error("failed to load stats");
    return res.json();
  }

  function renderTiles(totals) {
    const tiles = [
      { label: "total plays", value: totals.total_plays || 0 },
      { label: "wins", value: totals.wins || 0 },
      { label: "losses", value: totals.losses || 0 },
      { label: "abandoned", value: totals.abandoned || 0 },
    ];
    document.getElementById("tiles").innerHTML = tiles
      .map(
        (t) => `<div class="tile"><div class="value">${t.value}</div><div class="label">${t.label}</div></div>`
      )
      .join("");
  }

  function renderChart(byDay) {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const counts = Object.fromEntries(byDay.map((r) => [r.day, r.count]));
    const max = Math.max(1, ...days.map((d) => counts[d] || 0));

    document.getElementById("chart").innerHTML = days
      .map((day) => {
        const count = counts[day] || 0;
        const pct = Math.max(2, Math.round((count / max) * 100));
        const empty = count === 0 ? ' data-empty="true"' : "";
        return `<div class="bar" style="height:${pct}%"${empty}><span class="tip">${day}: ${count}</span></div>`;
      })
      .join("");
  }

  function renderCountries(byCountry) {
    const max = Math.max(1, ...byCountry.map((r) => r.count));
    document.getElementById("countries").innerHTML = byCountry
      .map(
        (r) => `
        <div class="row">
          <span>${r.country}</span>
          <span class="fill-track"><span class="fill" style="width:${(r.count / max) * 100}%"></span></span>
          <span class="count">${r.count}</span>
        </div>`
      )
      .join("");
  }

  function renderRecent(recent) {
    const tbody = document.querySelector("#recentTable tbody");
    tbody.innerHTML = recent
      .map((p) => {
        const location = [p.city, p.region, p.country].filter(Boolean).join(", ") || "Unknown";
        const outcomeClass =
          p.outcome === "win" ? "outcome-win" : p.outcome === "loss" ? "outcome-loss" : "outcome-none";
        const outcomeText =
          p.outcome === "win"
            ? `win (${p.player_score}–${p.ai_score})`
            : p.outcome === "loss"
            ? `loss (${p.player_score}–${p.ai_score})`
            : "in progress";
        return `
        <tr>
          <td>${new Date(p.created_at + "Z").toLocaleString()}</td>
          <td>${location}</td>
          <td>${p.device_type || "?"}</td>
          <td>${p.browser || "?"} / ${p.os || "?"}</td>
          <td>${p.referrer ? p.referrer.slice(0, 40) : "direct"}</td>
          <td class="${outcomeClass}">${outcomeText}</td>
        </tr>`;
      })
      .join("");
  }

  async function loadDashboard() {
    const data = await fetchStats();
    if (!data) return;
    renderTiles(data.totals);
    renderChart(data.byDay);
    renderCountries(data.byCountry);
    renderRecent(data.recent);
    showDashboard();
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    try {
      await login(passwordInput.value);
      passwordInput.value = "";
      await loadDashboard();
    } catch {
      loginError.classList.remove("hidden");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    const token = getToken();
    clearToken();
    showLogin();
    if (token) {
      fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  });

  if (getToken()) {
    loadDashboard().catch(() => showLogin());
  } else {
    showLogin();
  }
})();
