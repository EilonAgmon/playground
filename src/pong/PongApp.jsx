import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createPongEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./pong.css";

export default function PongApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [gameOverText, setGameOverText] = useState("");

  useEffect(() => {
    const engine = createPongEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && extra.text) setGameOverText(extra.text);
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
            PONG
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
          <Text className="prompt">tap or click to serve</Text>
          <Text className="hint">move your paddle with mouse, touch-drag, or arrow keys &middot; first to 11 wins</Text>
        </Stack>
      )}

      {gameState === "gameover" && (
        <Stack className="overlay" align="center" justify="center" gap="sm" onClick={handleStart}>
          <Title order={1} className="glow">
            {gameOverText}
          </Title>
          <Text className="prompt">tap or click to play again</Text>
        </Stack>
      )}

      <Anchor
        href="https://github.com/EilonAgmon"
        target="_blank"
        rel="noopener"
        id="identity"
        underline="hover"
      >
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
