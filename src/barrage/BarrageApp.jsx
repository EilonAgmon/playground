import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createBarrageEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./barrage.css";

function bindHold(engineRef, name) {
  return {
    onPointerDown: (e) => {
      e.preventDefault();
      engineRef.current?.setKey(name, true);
    },
    onPointerUp: (e) => {
      e.preventDefault();
      engineRef.current?.setKey(name, false);
    },
    onPointerLeave: () => engineRef.current?.setKey(name, false),
    onPointerCancel: () => engineRef.current?.setKey(name, false),
  };
}

export default function BarrageApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [finalLives, setFinalLives] = useState(0);

  useEffect(() => {
    const engine = createBarrageEngine(canvasRef.current, {
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

  return (
    <div id="bstage">
      <Header floating />
      <div className="bviewport">
        <canvas id="bgame" ref={canvasRef} />

        {gameState === "playing" && (
          <div className="btouch" aria-hidden="true">
            <div className="bdpad">
              <button className="bdbtn bup" {...bindHold(engineRef, "up")} />
              <button className="bdbtn bleft" {...bindHold(engineRef, "left")} />
              <button className="bdbtn bright" {...bindHold(engineRef, "right")} />
              <button className="bdbtn bdown" {...bindHold(engineRef, "down")} />
            </div>
            <div className="bactions">
              <button
                className="babtn bjump"
                onPointerDown={(e) => {
                  e.preventDefault();
                  engineRef.current?.pressJump();
                }}
              >
                JUMP
              </button>
              <button className="babtn bfire" {...bindHold(engineRef, "fire")}>
                FIRE
              </button>
            </div>
          </div>
        )}

        {gameState === "title" && (
          <Stack className="boverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="bglow">
              BARRAGE
            </Title>
            <Text className="bbyline">
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
            <Text className="bprompt">tap or click to drop in</Text>
            <Text className="bhint">
              arrows/WASD to move &middot; up to aim, down to duck &middot; space to jump &middot; Z/X or click/tap to
              fire &middot; one weapon at a time — grab a new drop, lose the old one
            </Text>
          </Stack>
        )}

        {gameState === "win" && (
          <Stack className="boverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="bglow">
              CORE DESTROYED
            </Title>
            <Text className="bprompt score">
              made it through with {finalLives} {finalLives === 1 ? "life" : "lives"} left
            </Text>
            <Text className="bprompt">tap or click to run it again</Text>
          </Stack>
        )}

        {gameState === "gameover" && (
          <Stack className="boverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="bglow">
              OUT OF LIVES
            </Title>
            <Text className="bprompt">tap or click to try again</Text>
          </Stack>
        )}
      </div>

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="bidentity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
