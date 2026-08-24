import { useEffect, useRef, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { api } from "../shared/api.js";
import "./tickers.css";

const POLL_MS = 1200;
const CATEGORY_ORDER = ["Health", "Tech", "Gaming", "Energy", "Finance", "Materials", "Consumer", "Industrial", "Other"];

function secondsAgo(ts) {
  if (!ts) return null;
  return Math.max(0, Math.round((Date.now() - ts) / 1000));
}

export default function TickersApp() {
  const [tickers, setTickers] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("All");
  const [changedSymbols, setChangedSymbols] = useState(new Set());
  const [, forceTick] = useState(0);
  const prevRef = useRef(new Map());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await api.tickers();
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
        setStale(Boolean(data.stale));
        setChangedSymbols(changed);
        setError(next.length === 0 && !data.fetchedAt);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Re-render every few seconds purely so the "updated Ns ago" label ticks
  // forward between polls, without that being tied to actual data fetches.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const categoriesPresent = CATEGORY_ORDER.filter((c) => tickers.some((t) => t.category === c));
  const visible = filter === "All" ? tickers : tickers.filter((t) => t.category === filter);
  const ago = secondsAgo(fetchedAt);

  return (
    <>
      <Header title="Tickers" />
      <div id="tickers">
        <div className="tickers-hero fade-up">
          <h1 className="display-font tickers-title">Tickers</h1>
          <p className="tickers-sub">Today's biggest NYSE &amp; NASDAQ decliners, grouped by sector — refreshed live.</p>
          <p className="tickers-freshness">
            <span className={`tickers-dot ${stale ? "stale" : ""}`} />
            {error
              ? "Feed unavailable right now."
              : ago === null
              ? "Loading…"
              : `Updated ${ago === 0 ? "just now" : `${ago}s ago`}${stale ? " (last known good)" : ""}`}
          </p>
        </div>

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
                  {t.change?.toFixed(2)} ({t.changesPercentage?.toFixed(2)}%)
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="tickers-note">
          Categorized by matching keywords in each company's name — a heuristic, not official sector data. Leveraged
          and single-stock ETFs are excluded. Powered by Financial Modeling Prep.
        </p>
      </div>
    </>
  );
}
