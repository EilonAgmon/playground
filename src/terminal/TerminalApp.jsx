import { useEffect, useRef, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { runCommand } from "./commands.js";
import "./terminal.css";

const WELCOME = ["eilon@agmon:~$ portfolio --version 2.0", "Type 'help' to see what's available.", ""];

export default function TerminalApp() {
  const [lines, setLines] = useState(WELCOME);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  function submit(e) {
    e.preventDefault();
    const cmd = value;
    const result = runCommand(cmd);
    setHistory((h) => [...h, cmd]);
    setHistoryIndex(null);
    setValue("");

    if (result.clear) {
      setLines([]);
      return;
    }

    setLines((prev) => [...prev, `eilon@agmon:~$ ${cmd}`, ...result.lines, ""]);

    if (result.navigate) {
      setTimeout(() => {
        window.location.href = result.navigate;
      }, 600);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const idx = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(idx);
      setValue(history[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null) return;
      const idx = historyIndex + 1;
      if (idx >= history.length) {
        setHistoryIndex(null);
        setValue("");
      } else {
        setHistoryIndex(idx);
        setValue(history[idx]);
      }
    }
  }

  return (
    <>
      <Header title="Terminal" />
      <div id="terminal" onClick={() => inputRef.current?.focus()}>
        <div className="terminal-scroll" ref={scrollRef}>
          {lines.map((line, i) => (
            <div key={i} className="terminal-line">
              {line || " "}
            </div>
          ))}
          <form className="terminal-inputRow" onSubmit={submit}>
            <span className="terminal-prompt">eilon@agmon:~$</span>
            <input
              ref={inputRef}
              className="terminal-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="terminal command"
            />
          </form>
        </div>
      </div>
    </>
  );
}
