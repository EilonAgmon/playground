import { useEffect, useRef, useState } from "react";
import { Header } from "../shared/Header.jsx";
import {
  LEVELS,
  LEVEL_MAP,
  EVENTS,
  milestoneFor,
  createInitialState,
  tick,
  hireEngineer,
  setTrack,
  fireEngineer,
  resolveEvent,
  TICK_MS,
  SHIP_THRESHOLD,
  MAX_OFFLINE_TICKS,
  SAVE_KEY,
  STAT_HELP,
} from "./engine.js";
import "./hq.css";

const INTRO_SEEN_KEY = "hq_intro_seen_v1";

// pendingEvent.options holds live function references (apply). Those get
// silently dropped by the JSON round-trip through localStorage, so a reload
// while a decision modal is open needs its options reattached from the
// source EVENTS entry — otherwise clicking either option throws.
function rehydratePendingEvent(pendingEvent) {
  if (!pendingEvent) return null;
  const source = EVENTS.find((e) => e.key === pendingEvent.key);
  if (!source) return null;
  return { key: pendingEvent.key, text: pendingEvent.text, options: source.options };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved || !Array.isArray(saved.engineers)) return createInitialState();
    let s = { ...saved, pendingEvent: rehydratePendingEvent(saved.pendingEvent) };
    const elapsedTicks = Math.min(MAX_OFFLINE_TICKS, Math.floor((Date.now() - s.lastSavedAt) / TICK_MS));
    for (let i = 0; i < elapsedTicks; i++) {
      s = tick(s, { allowChoiceEvents: false });
      if (s.gameOver || s.pendingEvent) break;
    }
    return s;
  } catch {
    return createInitialState();
  }
}

export default function HqApp() {
  const [state, setState] = useState(loadState);
  const [cashFlash, setCashFlash] = useState(null);
  const [logPulse, setLogPulse] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !localStorage.getItem(INTRO_SEEN_KEY);
    } catch {
      return true;
    }
  });
  const intervalRef = useRef(null);
  const prevCash = useRef(state.cash);
  const prevLastLog = useRef(state.log[state.log.length - 1]);

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (Math.round(state.cash) !== Math.round(prevCash.current)) {
      setCashFlash(state.cash > prevCash.current ? "up" : "down");
      const t = setTimeout(() => setCashFlash(null), 500);
      prevCash.current = state.cash;
      return () => clearTimeout(t);
    }
  }, [state.cash]);

  useEffect(() => {
    const last = state.log[state.log.length - 1];
    if (last !== prevLastLog.current) {
      setLogPulse(true);
      prevLastLog.current = last;
      const t = setTimeout(() => setLogPulse(false), 500);
      return () => clearTimeout(t);
    }
  }, [state.log]);

  useEffect(() => {
    if (paused || state.gameOver) return undefined;
    intervalRef.current = setInterval(() => {
      setState((prev) => tick(prev));
    }, TICK_MS);
    return () => clearInterval(intervalRef.current);
  }, [paused, state.gameOver]);

  const milestone = milestoneFor(state.engineers.length);
  const dau = Math.min(350000, state.reputation * 900);

  function dismissIntro() {
    setShowIntro(false);
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // ignore storage failures (private browsing, quota, etc.)
    }
  }

  function handleHire(levelKey) {
    setState((prev) => hireEngineer(prev, levelKey));
  }

  function handleTrack(id, track) {
    setState((prev) => setTrack(prev, id, track));
  }

  function handleFire(id) {
    setState((prev) => fireEngineer(prev, id));
  }

  function handleResolve(optionIndex) {
    setState((prev) => resolveEvent(prev, optionIndex));
  }

  function handleRestart() {
    setState(createInitialState());
  }

  return (
    <>
      <Header title="HQ" />
      <div id="hq">
        {showIntro && (
          <div className="hq-intro surface fade-up">
            <p>
              Hire engineers, then put each on <strong>Features</strong> (fills Velocity — ships at the top for cash
              and reputation) or <strong>Bugs</strong> (fills Quality — decays if ignored, keeps incidents rarer).
              Morale drifts down on its own and throttles output, so keep the team happy. Run out of cash and HQ
              closes its doors.
            </p>
            <button className="hq-intro-dismiss" onClick={dismissIntro}>
              Got it
            </button>
          </div>
        )}

        <div className="hq-hero fade-up">
          <h1 className="display-font hq-title">HQ</h1>
          <p className="hq-milestone">
            Week {state.week} · {milestone.title}
          </p>
          <button
            className="hq-pause-btn"
            onClick={() => setPaused((p) => !p)}
            disabled={state.gameOver}
            aria-pressed={paused}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>

        <div className="hq-stats fade-up">
          <div className="hq-stat">
            <span>Cash</span>
            <strong className={`${state.cash < 20 ? "warn" : ""} ${cashFlash ? `flash-${cashFlash}` : ""}`}>
              ${Math.round(state.cash)}
            </strong>
            <small className="hq-stat-help">{STAT_HELP.cash}</small>
          </div>
          <div className="hq-stat">
            <span>Morale</span>
            <div className="hq-bar">
              <div className="hq-bar-fill" style={{ width: `${state.morale}%`, background: "var(--accent-2)" }} />
            </div>
            <small className="hq-stat-help">
              {Math.round(state.morale)}/100 — {STAT_HELP.morale}
            </small>
          </div>
          <div className="hq-stat">
            <span>Velocity</span>
            <div className="hq-bar">
              <div
                className="hq-bar-fill"
                style={{ width: `${Math.min(100, (state.velocity / SHIP_THRESHOLD) * 100)}%` }}
              />
            </div>
            <small className="hq-stat-help">
              {Math.round(state.velocity)}/{SHIP_THRESHOLD} — {STAT_HELP.velocity}
            </small>
          </div>
          <div className="hq-stat">
            <span>Quality</span>
            <div className="hq-bar">
              <div
                className="hq-bar-fill"
                style={{ width: `${state.quality}%`, background: "var(--accent-2)" }}
              />
            </div>
            <small className="hq-stat-help">
              {Math.round(state.quality)}/100 — {STAT_HELP.quality}
            </small>
          </div>
          <div className="hq-stat">
            <span>~DAU</span>
            <strong>{dau.toLocaleString()}</strong>
            <small className="hq-stat-help">{STAT_HELP.dau}</small>
          </div>
        </div>

        <div className="hq-panel surface fade-up">
          <p className="hq-panel-title">Roster ({state.engineers.length})</p>
          <p className="hq-panel-subtitle">Features push Velocity toward a ship. Bugs build Quality and guard against incidents.</p>
          <div className="hq-roster">
            {state.engineers.length === 0 && <p className="hq-empty">No one left. Hire someone.</p>}
            {state.engineers.map((e) => (
              <div key={e.id} className="hq-engineer">
                <div className="hq-engineer-info">
                  <span className="hq-engineer-name">{e.name}</span>
                  <span className="hq-engineer-level">{LEVEL_MAP[e.level].name}</span>
                </div>
                <div className="hq-engineer-actions">
                  <button
                    className={`hq-track-btn ${e.track === "feature" ? "active" : ""}`}
                    onClick={() => handleTrack(e.id, "feature")}
                  >
                    Features
                  </button>
                  <button
                    className={`hq-track-btn ${e.track === "bugs" ? "active" : ""}`}
                    onClick={() => handleTrack(e.id, "bugs")}
                  >
                    Bugs
                  </button>
                  <button className="hq-fire-btn" onClick={() => handleFire(e.id)} aria-label={`Let ${e.name} go`}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hq-panel surface fade-up">
          <p className="hq-panel-title">Hire</p>
          <div className="hq-hire-grid">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                className="hq-hire-btn"
                disabled={state.cash < l.hireCost || state.gameOver}
                onClick={() => handleHire(l.key)}
              >
                <span className="hq-hire-name">{l.name}</span>
                <span className="hq-hire-cost">${l.hireCost}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hq-log surface fade-up">
          {state.log.slice(-5).map((line, i, arr) => (
            <p key={i} className={`hq-log-line ${i === arr.length - 1 && logPulse ? "hq-log-newest" : ""}`}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {state.pendingEvent && (
        <div className="hq-overlay">
          <div className="hq-modal surface">
            <p className="hq-modal-text">{state.pendingEvent.text}</p>
            <div className="hq-modal-actions">
              {state.pendingEvent.options.map((opt, i) => (
                <button key={i} className="hq-modal-btn" onClick={() => handleResolve(i)}>
                  {opt.label}
                  {opt.hint && <span className="hq-modal-hint">{opt.hint}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.gameOver && (
        <div className="hq-overlay">
          <div className="hq-modal surface">
            <p className="hq-modal-title">Out of runway</p>
            <p className="hq-modal-text">
              You made it to week {state.week} with {state.engineers.length} engineers and shipped {state.reputation}{" "}
              features. {milestone.title}.
            </p>
            <button className="hq-modal-btn primary" onClick={handleRestart}>
              Start a new company
            </button>
          </div>
        </div>
      )}
    </>
  );
}
