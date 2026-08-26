import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createVolfiedEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./volfied.css";

export default function VolfiedApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const joystickRef = useRef(null);
  const nubRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [gameOverText, setGameOverText] = useState("");
  const [score, setScore] = useState(0);
  const [victory, setVictory] = useState(false);

  useEffect(() => {
    const engine = createVolfiedEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && extra.text) setGameOverText(extra.text);
        if (extra && typeof extra.score === "number") setScore(extra.score);
        setVictory(Boolean(extra && extra.victory));
      },
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  function handleStart() {
    engineRef.current && engineRef.current.startOrRestart();
  }

  useEffect(() => {
    const base = joystickRef.current;
    const nub = nubRef.current;
    if (!base || !nub) return;

    let activeTouchId = null;
    const RADIUS = 44;

    function updateFromTouch(t) {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = t.clientX - cx;
      let dy = t.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS) {
        dx = (dx / dist) * RADIUS;
        dy = (dy / dist) * RADIUS;
      }
      nub.style.transform = `translate(${dx}px, ${dy}px)`;
      const norm = Math.max(dist, RADIUS);
      engineRef.current && engineRef.current.setJoystick(dx / norm, dy / norm);
    }

    function reset() {
      activeTouchId = null;
      nub.style.transform = "translate(0, 0)";
      engineRef.current && engineRef.current.setJoystick(0, 0);
    }

    function onTouchStart(e) {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t) return;
      activeTouchId = t.identifier;
      updateFromTouch(t);
    }
    function onTouchMove(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === activeTouchId) updateFromTouch(t);
      }
    }
    function onTouchEnd(e) {
      for (const t of e.changedTouches) {
        if (t.identifier === activeTouchId) reset();
      }
    }

    base.addEventListener("touchstart", onTouchStart, { passive: false });
    base.addEventListener("touchmove", onTouchMove, { passive: false });
    base.addEventListener("touchend", onTouchEnd);
    base.addEventListener("touchcancel", onTouchEnd);
    return () => {
      base.removeEventListener("touchstart", onTouchStart);
      base.removeEventListener("touchmove", onTouchMove);
      base.removeEventListener("touchend", onTouchEnd);
      base.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <div id="stage">
      <Header floating />
      <canvas id="game" ref={canvasRef} />

      {gameState === "playing" && (
        <div className="joystick" ref={joystickRef}>
          <div className="joystick-nub" ref={nubRef} />
        </div>
      )}

      {gameState === "title" && (
        <Stack className="overlay" align="center" justify="center" gap="sm" onClick={handleStart}>
          <Title order={1} className="glow">
            VOLFIED
          </Title>
          <Text className="byline">
            a game by{" "}
            <Anchor
              href="https://github.com/EilonAgmon"
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
            >
              Eilon Agmon
            </Anchor>
          </Text>
          <Text className="prompt">tap or click to launch</Text>
          <Text className="hint">
            arrow keys, WASD, or the joystick &middot; draw out from the border and back to claim 80% of the field
            &middot; enemies cutting your line give you a split second to finish it
          </Text>
        </Stack>
      )}

      {gameState === "gameover" && (
        <Stack className="overlay" align="center" justify="center" gap="sm" onClick={handleStart}>
          <Title order={1} className={`glow ${victory ? "victory" : ""}`}>
            {gameOverText}
          </Title>
          <Text className="prompt score">score {score}</Text>
          <Text className="prompt">tap or click to try again</Text>
        </Stack>
      )}

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="identity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
