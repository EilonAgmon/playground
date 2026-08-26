import { useEffect, useRef, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { spinReels, evaluate, randomSymbol, BET, START_CREDITS, SYMBOLS } from "./engine.js";
import { SYMBOL_ICONS } from "./ReelSymbols.jsx";
import "./reels.css";

const CREDITS_KEY = "reels_credits";

function randomDisplay() {
  return [0, 1, 2].map(() => [0, 1, 2].map(() => randomSymbol()));
}

export default function ReelsApp() {
  const [credits, setCredits] = useState(() => {
    const saved = Number(localStorage.getItem(CREDITS_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : START_CREDITS;
  });
  const [reels, setReels] = useState(randomDisplay);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [message, setMessage] = useState("Spin to start harvesting.");
  const [win, setWin] = useState(false);
  const timers = useRef([]);
  const spinning = spinningReels.some(Boolean);

  useEffect(() => {
    localStorage.setItem(CREDITS_KEY, String(credits));
  }, [credits]);

  useEffect(() => () => timers.current.forEach(clearInterval), []);

  function handleSpin() {
    if (spinning || credits < BET) return;
    setCredits((c) => c - BET);
    setMessage("Spinning…");
    const result = spinReels();

    [0, 1, 2].forEach((i) => {
      setSpinningReels((s) => s.map((v, idx) => (idx === i ? true : v)));

      const flicker = setInterval(() => {
        setReels((prev) => prev.map((reel, idx) => (idx === i ? [randomSymbol(), randomSymbol(), randomSymbol()] : reel)));
      }, 70);
      timers.current.push(flicker);

      const stopDelay = 700 + i * 400;
      const stopTimer = setTimeout(() => {
        clearInterval(flicker);
        setReels((prev) => prev.map((reel, idx) => (idx === i ? result[i] : reel)));
        setSpinningReels((s) => s.map((v, idx) => (idx === i ? false : v)));

        if (i === 2) {
          const outcome = evaluate(result, BET);
          if (outcome.win > 0) {
            setCredits((c) => c + outcome.win);
            setMessage(
              outcome.symbol
                ? `${outcome.symbol.name} × 3 — +${outcome.win} credits!`
                : `Two of a kind — +${outcome.win} credits.`
            );
            setWin(true);
            setTimeout(() => setWin(false), 900);
          } else {
            setMessage("No match — spin again.");
          }
        }
      }, stopDelay);
      timers.current.push(stopTimer);
    });
  }

  function handleReset() {
    setCredits(START_CREDITS);
    setMessage("Credits topped up.");
  }

  return (
    <>
      <Header title="Reels" />
      <div id="reels">
        <div className="reels-hero fade-up">
          <h1 className="display-font reels-title">Harvest Reels</h1>
          <p className="reels-sub">An original slot machine — purely for fun, no real money, ever.</p>
        </div>

        <div className={`reels-machine surface fade-up ${win ? "win-glow" : ""}`}>
          <div className="reels-credits">
            <span>Credits</span>
            <strong className={win ? "win-pop" : ""}>{credits}</strong>
          </div>

          <div className="reels-window">
            {reels.map((reel, i) => (
              <div key={i} className={`reel-col ${spinningReels[i] ? "spinning" : ""}`}>
                {reel.map((key, row) => {
                  const Icon = SYMBOL_ICONS[key];
                  return (
                    <div key={row} className={`reel-cell ${row === 1 ? "payline" : ""}`}>
                      <Icon />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="reels-message">{message}</p>

          <div className="reels-actions">
            <button className="reels-btn" onClick={handleSpin} disabled={spinning || credits < BET}>
              {spinning ? "Spinning…" : `Spin (${BET})`}
            </button>
            {credits < BET && !spinning && (
              <button className="reels-btn reels-btn-outline" onClick={handleReset}>
                Top up credits
              </button>
            )}
          </div>
        </div>

        <div className="reels-paytable surface fade-up">
          <p className="reels-paytable-title">Paytable — match 3 on the center line</p>
          <div className="reels-paytable-grid">
            {SYMBOLS.map((s) => {
              const Icon = SYMBOL_ICONS[s.key];
              return (
                <div key={s.key} className="reels-paytable-row">
                  <span className="reels-paytable-icon">
                    <Icon />
                  </span>
                  <span>{s.name}</span>
                  <span className="reels-paytable-mult">×{s.payout}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
