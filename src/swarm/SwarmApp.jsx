import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createSwarmEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./swarm.css";

export default function SwarmApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [finalLives, setFinalLives] = useState(0);
  const [wave, setWave] = useState(1);

  useEffect(() => {
    const engine = createSwarmEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && typeof extra.lives === "number") setFinalLives(extra.lives);
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
    <div id="wstage">
      <Header floating />
      <div className="wviewport">
        <canvas id="wgame" ref={canvasRef} />

        {gameState === "title" && (
          <Stack className="woverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="wglow">
              SWARM
            </Title>
            <Text className="wbyline">
              a game by{" "}
              <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                Eilon Agmon
              </Anchor>
            </Text>
            <Text className="wprompt">tap or click to launch</Text>
            <Text className="whint">
              mouse/touch-drag or arrow keys to move &middot; hold to fire &middot; watch the formation — anything can
              peel off and dive at you &middot; clear all 3 waves
            </Text>
          </Stack>
        )}

        {gameState === "win" && (
          <Stack className="woverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="wglow">
              SWARM BROKEN
            </Title>
            <Text className="wprompt score">
              cleared all 3 waves with {finalLives} {finalLives === 1 ? "life" : "lives"} left
            </Text>
            <Text className="wprompt">tap or click to fly again</Text>
          </Stack>
        )}

        {gameState === "gameover" && (
          <Stack className="woverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="wglow">
              OVERRUN
            </Title>
            <Text className="wprompt score">made it to wave {wave}</Text>
            <Text className="wprompt">tap or click to try again</Text>
          </Stack>
        )}
      </div>

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="widentity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
