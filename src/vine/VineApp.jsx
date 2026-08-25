import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createVineEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./vine.css";

export default function VineApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [score, setScore] = useState(0);

  useEffect(() => {
    const engine = createVineEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && typeof extra.score === "number") setScore(extra.score);
      },
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  function handleStart() {
    engineRef.current && engineRef.current.startOrRestart();
  }

  function handleDirection(dx, dy) {
    engineRef.current && engineRef.current.setDirection(dx, dy);
  }

  return (
    <div id="stage">
      <Header floating />
      <canvas id="game" ref={canvasRef} />

      {gameState === "playing" && (
        <div className="dpad" onClick={(e) => e.stopPropagation()}>
          <button className="dpad-btn dpad-up" onClick={() => handleDirection(0, -1)} aria-label="up">
            &uarr;
          </button>
          <button className="dpad-btn dpad-left" onClick={() => handleDirection(-1, 0)} aria-label="left">
            &larr;
          </button>
          <button className="dpad-btn dpad-right" onClick={() => handleDirection(1, 0)} aria-label="right">
            &rarr;
          </button>
          <button className="dpad-btn dpad-down" onClick={() => handleDirection(0, 1)} aria-label="down">
            &darr;
          </button>
        </div>
      )}

      {gameState === "title" && (
        <Stack className="overlay" align="center" justify="center" gap="sm" onClick={handleStart}>
          <Title order={1} className="glow">
            VINE
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
          <Text className="prompt">tap or click to plant</Text>
          <Text className="hint">arrow keys, WASD, swipe, or the on-screen pad &middot; eat fruit to grow</Text>
        </Stack>
      )}

      {gameState === "gameover" && (
        <Stack className="overlay" align="center" justify="center" gap="sm" onClick={handleStart}>
          <Title order={1} className="glow">
            WILTED
          </Title>
          <Text className="prompt score">grew to {score}</Text>
          <Text className="prompt">tap or click to replant</Text>
        </Stack>
      )}

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="identity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
