import { useEffect, useRef, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { api } from "../shared/api.js";
import "./tickers.css";

const CATEGORY_ORDER = ["Health", "Tech", "Gaming", "Energy", "Finance", "Materials", "Consumer", "Industrial", "Other"];
const WINDOWS = [
  { key: "today", label: "Today" },
  { key: "48h", label: "48h" },
  { key: "week", label: "Week" },
];
const REQUIRED_DAYS = { "48h": 2, week: 7 };
const FAST_POLL_MS = 1200;
const SLOW_POLL_MS = 60000;

function formatAgo(ts) {
  if (!ts) return null;
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export default function TickersApp() {
  const [activeWindow, setActiveWindow] = useState("today");
  const [tickers, setTickers] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [daysAvailable, setDaysAvailable] = useState(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("All");
  const [changedSymbols, setChangedSymbols] = useState(new Set());
  const [, forceTick] = useState(0);
  const prevRef = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    prevRef.current = new Map();
    setFilter("All");

    async function poll() {
      try {
        const data = await api.tickers(activeWindow);
        if (cancelled) return;
        const next = data.tickers || [];

        const prev = prevRef.current;
        const changed = new Set();
        next.forEach((t) => {
          const before = prev.get(t.symbol);
          if (!before || before.price !== t.price) changed.add(t.symbol);
        });
        prevRef.current = new Map(next.map((t) => [t.symbol, t]));

        setTickers(next);
        setFetchedAt(data.fetchedAt || null);
        setDaysAvailable(data.daysAvailable ?? null);
        setStale(Boolean(data.stale));
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();
    const interval = setInterval(poll, activeWindow === "today" ? FAST_POLL_MS : SLOW_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeWindow]);

  // Re-render every few seconds purely so the "updated Ns ago" label ticks
  // forward between polls, without that being tied to actual data fetches.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const categoriesPresent = CATEGORY_ORDER.filter((c) => tickers.some((t) => t.category === c));
  const visible = filter === "All" ? tickers : tickers.filter((t) => t.category === filter);
  const requiredDays = REQUIRED_DAYS[activeWindow];
  const buildingHistory = requiredDays && daysAvailable !== null && daysAvailable < requiredDays;

  return (
    <>
      <Header title="Tickers" />
      <div id="tickers">
        <div className="tickers-hero fade-up">
          <h1 className="display-font tickers-title">Tickers</h1>
          <p className="tickers-sub">Biggest NYSE &amp; NASDAQ decliners, grouped by sector.</p>
          <p className="tickers-freshness">
            <span className={`tickers-dot ${stale ? "stale" : ""}`} />
            {error
              ? "Feed unavailable right now."
              : fetchedAt === null
              ? "Loading…"
              : activeWindow === "today"
              ? `Updated ${formatAgo(fetchedAt)}${stale ? " (last known good)" : ""}`
              : `Latest snapshot ${formatAgo(fetchedAt)}`}
          </p>
        </div>

        <div className="tickers-windows fade-up">
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              className={`tickers-window-btn ${activeWindow === w.key ? "active" : ""}`}
              onClick={() => setActiveWindow(w.key)}
            >
              {w.label}
            </button>
          ))}
        </div>

        {buildingHistory && (
          <p className="tickers-history-note fade-up">
            Still building history — {daysAvailable} day{daysAvailable === 1 ? "" : "s"} collected so far
            {activeWindow === "week" ? " toward a full week" : ""}. This grows richer over time rather than being
            retroactive.
          </p>
        )}

        <div className="tickers-filters fade-up">
          <button className={`tickers-chip ${filter === "All" ? "active" : ""}`} onClick={() => setFilter("All")}>
            All ({tickers.length})
          </button>
          {categoriesPresent.map((c) => (
            <button key={c} className={`tickers-chip ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>
              {c} ({tickers.filter((t) => t.category === c).length})
            </button>
          ))}
        </div>

        <div className="tickers-grid fade-up">
          {visible.length === 0 && !error && (
            <p className="tickers-empty">
              {tickers.length === 0
                ? "No decliners in the feed right now — check back shortly."
                : "Nothing in this category right now."}
            </p>
          )}
          {visible.map((t) => (
            <div key={t.symbol} className={`tickers-card ${changedSymbols.has(t.symbol) ? "flash" : ""}`}>
              <div className="tickers-card-top">
                <span className="tickers-symbol">{t.symbol}</span>
                <span className="tickers-category">{t.category}</span>
              </div>
              <p className="tickers-name">{t.name}</p>
              <div className="tickers-card-bottom">
                <span className="tickers-price">${t.price?.toFixed(2)}</span>
                <span className="tickers-change">
                  {activeWindow === "today" && t.change != null ? `${t.change.toFixed(2)} ` : ""}
                  ({t.changesPercentage?.toFixed(2)}%)
                </span>
              </div>
              {activeWindow !== "today" && t.daysSeen > 1 && (
                <p className="tickers-daysseen">Flagged {t.daysSeen}&times; this window</p>
              )}
            </div>
          ))}
        </div>

        <p className="tickers-note">
          Categorized by matching keywords in each company's name — a heuristic, not official sector data. Leveraged
          and single-stock ETFs are excluded. 48h/week views are built from daily snapshots collected going forward
          (FMP's free tier has no historical "as of" data for this feed), and show change from a ticker's first to
          most recent appearance in that window, not a fixed-point return. Powered by Financial Modeling Prep.
        </p>
      </div>
    </>
  );
}
