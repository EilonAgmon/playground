import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createCrossingEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./crossing.css";

export default function CrossingApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [finalLives, setFinalLives] = useState(0);

  useEffect(() => {
    const engine = createCrossingEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && typeof extra.lives === "number") setFinalLives(extra.lives);
      },
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  function handleStart() {
    engineRef.current && engineRef.current.startOrRestart();
  }

  function hop(dir) {
    engineRef.current?.tryHop(dir);
  }

  return (
    <div id="cstage">
      <Header floating />
      <div className="cviewport">
        <canvas id="cgame" ref={canvasRef} />

        {gameState === "playing" && (
          <div className="ctouch" aria-hidden="true">
            <div className="cdpad">
              <button className="cdbtn cup" onPointerDown={(e) => { e.preventDefault(); hop("up"); }} />
              <button className="cdbtn cleft" onPointerDown={(e) => { e.preventDefault(); hop("left"); }} />
              <button className="cdbtn cright" onPointerDown={(e) => { e.preventDefault(); hop("right"); }} />
              <button className="cdbtn cdown" onPointerDown={(e) => { e.preventDefault(); hop("down"); }} />
            </div>
          </div>
        )}

        {gameState === "title" && (
          <Stack className="coverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="cglow">
              CROSSING
            </Title>
            <Text className="cbyline">
              a game by{" "}
              <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                Eilon Agmon
              </Anchor>
            </Text>
            <Text className="cprompt">tap or click to hop in</Text>
            <Text className="chint">
              arrows/WASD to hop, one cell at a time &middot; cross the road, ride the logs across the river,
              fill all three homes &middot; don't dawdle — the clock is always running
            </Text>
          </Stack>
        )}

        {gameState === "win" && (
          <Stack className="coverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="cglow">
              ALL HOME
            </Title>
            <Text className="cprompt score">
              made it with {finalLives} {finalLives === 1 ? "life" : "lives"} left
            </Text>
            <Text className="cprompt">tap or click to cross again</Text>
          </Stack>
        )}

        {gameState === "gameover" && (
          <Stack className="coverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="cglow">
              OUT OF HOPS
            </Title>
            <Text className="cprompt">tap or click to try again</Text>
          </Stack>
        )}
      </div>

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="cidentity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
