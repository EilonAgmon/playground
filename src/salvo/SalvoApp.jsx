import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createSalvoEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./salvo.css";

export default function SalvoApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [gameOverText, setGameOverText] = useState("");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);

  useEffect(() => {
    const engine = createSalvoEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && extra.text) setGameOverText(extra.text);
        if (extra && typeof extra.score === "number") setScore(extra.score);
        if (extra && typeof extra.wave === "number") setWave(extra.wave);
      },
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  function handleStart() {
    engineRef.current && engineRef.current.startOrRestart();
  }

  return (
    <div id="stage">
      <Header floating />
      <canvas id="game" ref={canvasRef} />

      {gameState === "title" && (
        <Stack className="overlay" align="center" justify="center" gap="sm" onClick={handleStart}>
          <Title order={1} className="glow">
            SALVO
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
            arrow keys or touch-drag to move, space/tap/click to fire &middot; hold the line — one shot on screen at a
            time
          </Text>
        </Stack>
      )}

      {gameState === "gameover" && (
        <Stack className="overlay" align="center" justify="center" gap="sm" onClick={handleStart}>
          <Title order={1} className="glow">
            {gameOverText}
          </Title>
          <Text className="prompt score">
            score {score} · wave {wave}
          </Text>
          <Text className="prompt">tap or click to try again</Text>
        </Stack>
      )}

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="identity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
