import { useEffect, useRef, useState } from "react";
import { createInitialState, spin, toggleLock, resolveTurn, aiChooseLocks } from "./engine.js";
import { HERO_LIST } from "./heroes.js";
import HeroPicker from "./HeroPicker.jsx";
import WheelsGame from "./WheelsGame.jsx";
import "./wheels.css";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomHero() {
  return HERO_LIST[Math.floor(Math.random() * HERO_LIST.length)].key;
}

export default function WheelsApp() {
  const [state, setState] = useState(null);
  const runningAiTurn = useRef(false);
  // Bumped on every new game (including restarts) so an in-flight AI-turn
  // loop from an abandoned game can detect it's stale and stop touching
  // state instead of silently clobbering the next game's fresh state.
  const gameId = useRef(0);

  useEffect(() => {
    if (!state || state.winner || state.phase !== "aiTurn" || runningAiTurn.current) return;
    runningAiTurn.current = true;
    const myGameId = gameId.current;
    const stillCurrent = () => gameId.current === myGameId;

    (async () => {
      let s = state;
      for (let i = 0; i < 3 && stillCurrent(); i++) {
        await sleep(550);
        if (!stillCurrent()) break;
        s = spin(s);
        setState(s);
        if (i < 2) {
          await sleep(350);
          if (!stillCurrent()) break;
          s = { ...s, wheels: aiChooseLocks(s) };
          setState(s);
        }
      }
      if (stillCurrent()) {
        await sleep(500);
        if (stillCurrent()) setState((prev) => resolveTurn(prev));
      }
      runningAiTurn.current = false;
    })();
  }, [state]);

  function handleConfirmHeroes(left, right) {
    gameId.current += 1;
    runningAiTurn.current = false;
    setState(createInitialState(left, right, randomHero(), randomHero()));
  }

  function handleRestart() {
    gameId.current += 1;
    runningAiTurn.current = false;
    setState(null);
  }

  function handleSpin() {
    setState((prev) => (prev && prev.phase === "playerTurn" ? spin(prev) : prev));
  }

  function handleToggleLock(index) {
    setState((prev) => (prev && prev.phase === "playerTurn" ? toggleLock(prev, index) : prev));
  }

  function handleResolve() {
    setState((prev) => (prev && prev.phase === "playerTurn" ? resolveTurn(prev) : prev));
  }

  if (!state) {
    return <HeroPicker onConfirm={handleConfirmHeroes} />;
  }

  return (
    <WheelsGame
      state={state}
      onSpin={handleSpin}
      onToggleLock={handleToggleLock}
      onResolve={handleResolve}
      onRestart={handleRestart}
    />
  );
}
