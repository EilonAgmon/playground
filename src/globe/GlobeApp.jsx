import { useEffect, useMemo, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { COUNTRIES, CONTINENTS, flagEmoji } from "./countries.js";
import "./globe.css";

const STATUS_KEY = "globe_status";
const CYCLE = { none: "visited", visited: "wishlist", wishlist: "none" };

function loadStatus() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATUS_KEY));
    if (saved && typeof saved === "object") return saved;
  } catch {
    // ignore malformed storage
  }
  return {};
}

export default function GlobeApp() {
  const [status, setStatus] = useState(loadStatus);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  }, [status]);

  const visitedCount = useMemo(() => Object.values(status).filter((s) => s === "visited").length, [status]);
  const wishlistCount = useMemo(() => Object.values(status).filter((s) => s === "wishlist").length, [status]);
  const continentsCovered = useMemo(() => {
    const visitedContinents = new Set(
      COUNTRIES.filter((c) => status[c.code] === "visited").map((c) => c.continent)
    );
    return visitedContinents.size;
  }, [status]);
  const pctOfWorld = Math.round((visitedCount / COUNTRIES.length) * 100);

  function cycleStatus(code) {
    setStatus((prev) => {
      const current = prev[code] || "none";
      const next = CYCLE[current];
      const copy = { ...prev };
      if (next === "none") delete copy[code];
      else copy[code] = next;
      return copy;
    });
  }

  const filtered = COUNTRIES.filter((c) => {
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "visited") return status[c.code] === "visited";
    if (filter === "wishlist") return status[c.code] === "wishlist";
    return true;
  });

  return (
    <>
      <Header title="Globe" />
      <div id="globe">
        <div className="globe-hero fade-up">
          <h1 className="display-font globe-title">Globe</h1>
          <p className="globe-sub">Where you've been, where you're going. Tap a country to mark it — once for visited, twice for the wishlist.</p>
        </div>

        <div className="globe-stats fade-up">
          <div className="globe-stat">
            <strong>{visitedCount}</strong>
            <span>visited</span>
          </div>
          <div className="globe-stat">
            <strong>{pctOfWorld}%</strong>
            <span>of the world</span>
          </div>
          <div className="globe-stat">
            <strong>
              {continentsCovered}/{CONTINENTS.length}
            </strong>
            <span>continents</span>
          </div>
          <div className="globe-stat">
            <strong>{wishlistCount}</strong>
            <span>wishlist</span>
          </div>
        </div>

        <div className="globe-controls fade-up">
          <input
            className="globe-search"
            placeholder="Search countries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="globe-filters">
            {["all", "visited", "wishlist"].map((f) => (
              <button
                key={f}
                className={`globe-chip ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="globe-grid fade-up">
          {filtered.map((c) => {
            const s = status[c.code] || "none";
            return (
              <button
                key={c.code}
                className={`globe-tile status-${s}`}
                onClick={() => cycleStatus(c.code)}
                title={c.name}
              >
                <span className="globe-flag">{flagEmoji(c.code)}</span>
                <span className="globe-name">{c.name}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="globe-empty">No countries match.</p>}
        </div>
      </div>
    </>
  );
}
