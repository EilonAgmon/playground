import { useEffect, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { api } from "../shared/api.js";
import "./jobs.css";

const CATEGORY_ORDER = ["Director of Engineering", "VP of Engineering", "CTO"];
const AUTO_REFRESH_MS = 5 * 60 * 1000;

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function freshnessLabel(fetchedAt) {
  if (!fetchedAt) return "Loading…";
  const mins = Math.max(0, Math.round((Date.now() - fetchedAt) / 60000));
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  return `Updated ${Math.round(mins / 60)}h ago`;
}

export default function JobsApp() {
  const [jobs, setJobs] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  async function load() {
    try {
      const data = await api.jobs();
      setJobs(data.jobs || []);
      setFetchedAt(data.fetchedAt || null);
      setStale(Boolean(data.stale));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const categoriesPresent = CATEGORY_ORDER.filter((c) => jobs.some((j) => j.category === c));
  const visible = filter === "All" ? jobs : jobs.filter((j) => j.category === filter);

  return (
    <>
      <Header title="Jobs" />
      <div id="jobs">
        <div className="jobs-hero fade-up">
          <h1 className="display-font jobs-title">Jobs</h1>
          <p className="jobs-sub">
            Director of Engineering, VP of Engineering, and CTO roles posted in the last 24 hours at known gaming
            companies — Nintendo, Sony, EA, Playtika, and around 40 others — in any of the markets covered below.
            Israel-based roles at any company are a separate leg, pending a data source that actually covers Israel.
          </p>
          <p className="jobs-freshness">
            <span className={`jobs-dot ${stale ? "stale" : ""}`} />
            {freshnessLabel(fetchedAt)}
            {stale ? " (last known good)" : ""}
            <button className="jobs-refresh" onClick={load} disabled={loading}>
              Refresh
            </button>
          </p>
        </div>

        {jobs.length > 0 && (
          <div className="jobs-filters fade-up">
            <button className={`jobs-chip ${filter === "All" ? "active" : ""}`} onClick={() => setFilter("All")}>
              All ({jobs.length})
            </button>
            {categoriesPresent.map((c) => (
              <button key={c} className={`jobs-chip ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>
                {c} ({jobs.filter((j) => j.category === c).length})
              </button>
            ))}
          </div>
        )}

        <div className="jobs-list fade-up">
          {error && <p className="jobs-empty">Jobs feed unavailable right now — try again shortly.</p>}
          {!error && jobs.length === 0 && !loading && (
            <div className="jobs-empty">
              <p>No matching roles posted in the last 24 hours.</p>
              <p className="jobs-empty-detail">
                This is intentionally narrow — director-level-and-up roles at a specific list of gaming companies
                don't open every day. Worth checking back periodically rather than expecting a full feed.
              </p>
            </div>
          )}
          {visible.map((job) => (
            <a key={job.id} href={job.url} target="_blank" rel="noopener noreferrer" className="jobs-card">
              <div className="jobs-card-top">
                <span className="jobs-card-title">{job.title}</span>
                <span className="jobs-card-category">{job.category}</span>
              </div>
              <p className="jobs-card-company">
                {job.company}
                {job.location ? ` · ${job.location}` : ""}
              </p>
              <p className="jobs-card-posted">{timeAgo(job.created)} · Apply →</p>
            </a>
          ))}
        </div>

        <p className="jobs-note">
          Gaming-company roles via Adzuna, searched across the US, UK, Germany, France, Canada, and Australia —
          Adzuna doesn't index Israel or Japan at all, so Israeli postings and Nintendo's home-market roles are out
          of reach through this provider regardless. The gaming-company list is a hand-maintained set of well-known
          studios and publishers, not exhaustive.
        </p>
      </div>
    </>
  );
}
