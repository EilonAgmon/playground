import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createRicochetEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./ricochet.css";

export default function RicochetApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [gameOverText, setGameOverText] = useState("");
  const [score, setScore] = useState(0);

  useEffect(() => {
    const engine = createRicochetEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && extra.text) setGameOverText(extra.text);
        if (extra && typeof extra.score === "number") setScore(extra.score);
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
            RICOCHET
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
          <Text className="prompt">tap or click to start</Text>
          <Text className="hint">move the paddle with mouse, touch-drag, or arrow keys &middot; clear every brick</Text>
        </Stack>
      )}

      {gameState === "gameover" && (
        <Stack className="overlay" align="center" justify="center" gap="sm" onClick={handleStart}>
          <Title order={1} className="glow">
            {gameOverText}
          </Title>
          <Text className="prompt score">score {score}</Text>
          <Text className="prompt">tap or click to play again</Text>
        </Stack>
      )}

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="identity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
