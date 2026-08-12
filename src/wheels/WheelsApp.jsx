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

  useEffect(() => {
    if (!state || state.winner || state.phase !== "aiTurn" || runningAiTurn.current) return;
    runningAiTurn.current = true;

    (async () => {
      let s = state;
      for (let i = 0; i < 3; i++) {
        await sleep(550);
        s = spin(s);
        setState(s);
        if (i < 2) {
          await sleep(350);
          s = { ...s, wheels: aiChooseLocks(s) };
          setState(s);
        }
      }
      await sleep(500);
      s = resolveTurn(s);
      setState(s);
      runningAiTurn.current = false;
    })();
  }, [state]);

  function handleConfirmHeroes(left, right) {
    setState(createInitialState(left, right, randomHero(), randomHero()));
  }

  function handleRestart() {
    setState(null);
  }

  if (!state) {
    return <HeroPicker onConfirm={handleConfirmHeroes} />;
  }

  return (
    <WheelsGame
      state={state}
      onSpin={() => setState(spin(state))}
      onToggleLock={(i) => setState(toggleLock(state, i))}
      onResolve={() => setState(resolveTurn(state))}
      onRestart={handleRestart}
    />
  );
}
