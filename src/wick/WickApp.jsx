import { useEffect, useRef, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { createInitialState, processCommand, describeRoom } from "./engine.js";
import "./wick.css";

const RESTART_WORDS = new Set(["restart", "again", "new game", "reset"]);

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return idCounter;
}

function buildIntro(state) {
  return describeRoom(state, state.room, true);
}

function stormPhase(turns, ended) {
  if (ended === "LOST") return { label: "Wrecked", className: "storm-gale" };
  if (ended) return { label: "Held", className: "storm-calm" };
  if (turns >= 26) return { label: "Gale", className: "storm-gale" };
  if (turns >= 18) return { label: "Storm", className: "storm-heavy" };
  if (turns >= 10) return { label: "Rising wind", className: "storm-rising" };
  return { label: "Calm", className: "storm-calm" };
}

export default function WickApp() {
  const [state, setState] = useState(() => createInitialState());
  const [log, setLog] = useState(() => [{ id: nextId(), kind: "narrator", text: buildIntro(createInitialState()) }]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  function restart() {
    const fresh = createInitialState();
    setState(fresh);
    setLog([{ id: nextId(), kind: "narrator", text: buildIntro(fresh) }]);
    setCommandHistory([]);
    setHistoryIndex(-1);
    inputRef.current?.focus();
  }

  function submit(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (RESTART_WORDS.has(trimmed.toLowerCase())) {
      restart();
      return;
    }

    const justEnded = !state.ended;
    const { state: next, lines } = processCommand(state, trimmed);
    setState(next);
    setLog((prev) => [
      ...prev,
      { id: nextId(), kind: "command", text: trimmed },
      { id: nextId(), kind: justEnded && next.ended ? "ending" : "narrator", text: lines.join("\n") },
    ]);
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
  }

  function handleSubmit(e) {
    e.preventDefault();
    submit(input);
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const idx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(idx);
      setInput(commandHistory[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const idx = historyIndex + 1;
      if (idx >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(idx);
        setInput(commandHistory[idx]);
      }
    }
  }

  const phase = stormPhase(state.turns, state.ended);

  return (
    <div id="wick">
      <Header title="Wick" />
      <div className="wick-shell">
        <div className="wick-panel surface fade-up">
          <div className="wick-panel-bar">
            <div className="wick-brand">
              <span className="wick-brand-title display-font">Wick</span>
              <span className="wick-brand-tagline">a story about light, and what's left after it goes out</span>
            </div>
            <span className={`wick-storm-badge ${phase.className}`}>{phase.label}</span>
          </div>

          <div className="wick-log" ref={scrollRef} onClick={() => inputRef.current?.focus()}>
            {log.map((entry) => (
              <p key={entry.id} className={`wick-line wick-line-${entry.kind}`}>
                {entry.kind === "command" ? `> ${entry.text}` : entry.text}
              </p>
            ))}
            {state.ended && (
              <div className="wick-restart-row">
                <button type="button" className="wick-restart-btn" onClick={restart}>
                  Play again
                </button>
              </div>
            )}
          </div>

          <form className="wick-input-row" onSubmit={handleSubmit}>
            <span className="wick-prompt" aria-hidden="true">&gt;</span>
            <input
              ref={inputRef}
              className="wick-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={state.ended ? "restart" : "what do you do?"}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              autoFocus
              aria-label="Command input"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
