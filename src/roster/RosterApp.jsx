import { useEffect, useRef, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { REPORTS, CANDIDATES, HIRE_CALLS } from "./scenarios.js";
import { createInitialState, startShift, choose, makeHireCall, advanceSession, computeRating } from "./engine.js";
import "./roster.css";

const STATS_KEY = "roster_stats";

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY));
    if (saved && typeof saved.shiftsCompleted === "number") return saved;
  } catch {
    // ignore malformed storage
  }
  return { shiftsCompleted: 0, bestTotal: null };
}

function reportName(key) {
  return REPORTS.find((r) => r.key === key)?.name || key;
}

function candidateName(key) {
  return CANDIDATES.find((c) => c.key === key)?.name || key;
}

function sessionHeading(session) {
  if (session.type === "oneOnOne") {
    const report = REPORTS.find((r) => r.key === session.scenario.reportKey);
    return `1:1 — ${report.name}, ${report.role}`;
  }
  return `Interview — ${session.scenario.name}, ${session.scenario.roleApplied}`;
}

export default function RosterApp() {
  const [state, setState] = useState(createInitialState);
  const [stats, setStats] = useState(loadStats);
  const logEndRef = useRef(null);

  // sessionQueue is a fresh array only when startShift() runs, so it's a
  // stable key for "record this once per shift" even though phase stays
  // "debrief" across re-renders.
  useEffect(() => {
    if (state.phase !== "debrief") return;
    const rating = computeRating(state);
    setStats((prev) => {
      const next = {
        shiftsCompleted: prev.shiftsCompleted + 1,
        bestTotal: prev.bestTotal === null ? rating.total : Math.max(prev.bestTotal, rating.total),
      };
      localStorage.setItem(STATS_KEY, JSON.stringify(next));
      return next;
    });
  }, [state.phase, state.sessionQueue]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [state.log]);

  const inSession = ["beat", "outcome", "hire_call", "hire_result"].includes(state.phase);
  const session = inSession ? state.sessionQueue[state.sessionIndex] : null;
  const beat = state.phase === "beat" || state.phase === "hire_call" ? session.scenario.beats[state.currentBeatKey] : null;

  return (
    <>
      <Header title="Roster" />
      <div id="roster">
        <div className="roster-hero fade-up">
          <h1 className="display-font roster-title">Roster</h1>
          <p className="roster-sub">Short, branching manager conversations — 1:1s and hiring calls. Read the room, then live with the call.</p>
        </div>

        {state.phase === "intro" && (
          <div className="roster-intro surface fade-up">
            <p>
              Each shift is three conversations: two 1:1s pulled from your team, and one hiring-panel interview. What
              you say changes how much your reports trust you — and whether you read the candidate right.
            </p>
            {stats.shiftsCompleted > 0 && (
              <p className="roster-intro-stats">
                {stats.shiftsCompleted} shift{stats.shiftsCompleted === 1 ? "" : "s"} run · best score {stats.bestTotal}
              </p>
            )}
            <button className="roster-btn" onClick={() => setState(startShift())}>
              Start shift
            </button>
          </div>
        )}

        {inSession && (
          <div className="roster-session surface fade-up">
            <p className="roster-session-head">
              {sessionHeading(session)}
              <span className="roster-session-count">
                {state.sessionIndex + 1} / {state.sessionQueue.length}
              </span>
            </p>

            <div className="roster-log">
              {state.log.map((line, i) => (
                <p
                  key={i}
                  className={`roster-line ${line.speaker === "You" ? "you" : line.speaker ? "them" : "narration"}`}
                >
                  {line.speaker && line.speaker !== "You" && <strong>{line.speaker}: </strong>}
                  {line.speaker === "You" && <strong>You: </strong>}
                  {line.text}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>

            {state.phase === "beat" && (
              <div className="roster-options">
                {beat.options.map((opt, i) => (
                  <button key={i} className="roster-option" onClick={() => setState(choose(state, i))}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {state.phase === "hire_call" && (
              <div className="roster-options">
                {HIRE_CALLS.map((c) => (
                  <button key={c.key} className="roster-option call" onClick={() => setState(makeHireCall(state, c.key))}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {(state.phase === "outcome" || state.phase === "hire_result") && (
              <div className="roster-options">
                <button className="roster-btn" onClick={() => setState(advanceSession(state))}>
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {state.phase === "debrief" && (
          <Debrief state={state} onRestart={() => setState(startShift())} />
        )}
      </div>
    </>
  );
}

function Debrief({ state, onRestart }) {
  const rating = computeRating(state);
  const trustEntries = Object.entries(state.trustDelta);

  return (
    <div className="roster-debrief surface fade-up">
      <p className="roster-debrief-title" style={{ color: "var(--accent)" }}>
        {rating.title}
      </p>
      <p className="roster-debrief-blurb">{rating.blurb}</p>
      <p className="roster-debrief-score">Score: {rating.total}</p>

      {trustEntries.length > 0 && (
        <div className="roster-debrief-section">
          <p className="roster-debrief-label">Trust</p>
          {trustEntries.map(([key, delta]) => (
            <p key={key} className="roster-debrief-row">
              <span>{reportName(key)}</span>
              <span className={delta > 0 ? "pos" : delta < 0 ? "neg" : ""}>
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="roster-debrief-section">
        <p className="roster-debrief-label">Hiring call</p>
        {state.hireResults.map((r) => (
          <p key={r.candidateKey} className="roster-debrief-row">
            <span>{candidateName(r.candidateKey)}</span>
            <span className={r.verdict === "good" ? "pos" : r.verdict === "bad" ? "neg" : ""}>
              {r.verdict === "good" ? "Good read" : r.verdict === "bad" ? "Misread" : "Safe hedge"}
            </span>
          </p>
        ))}
      </div>

      <button className="roster-btn" onClick={onRestart}>
        Run another shift
      </button>
    </div>
  );
}
