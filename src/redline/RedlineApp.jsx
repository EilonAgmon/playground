import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createRedlineEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./redline.css";

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

export default function RedlineApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [finalLives, setFinalLives] = useState(0);

  useEffect(() => {
    const engine = createRedlineEngine(canvasRef.current, {
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
    <div id="rstage">
      <Header floating />
      <div className="rviewport">
        <canvas id="rgame" ref={canvasRef} />

        {gameState === "playing" && (
          <div className="rtouch" aria-hidden="true">
            <div className="rleftcontrols">
              <div className="rthrottle">
                <button className="rtbtn rup" {...bindHold(engineRef, "up")}>
                  ▲
                </button>
                <button className="rtbtn rdown" {...bindHold(engineRef, "down")}>
                  ▼
                </button>
              </div>
              <div className="rsteer">
                <button className="rsbtn rleft" {...bindHold(engineRef, "left")}>
                  ◀
                </button>
                <button className="rsbtn rright" {...bindHold(engineRef, "right")}>
                  ▶
                </button>
              </div>
            </div>
            <div className="ractions">
              <button
                className="rabtn roil"
                onPointerDown={(e) => {
                  e.preventDefault();
                  engineRef.current?.deployOil();
                }}
              >
                OIL
              </button>
              <button className="rabtn rfire" {...bindHold(engineRef, "fire")}>
                FIRE
              </button>
            </div>
          </div>
        )}

        {gameState === "title" && (
          <Stack className="roverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="rglow">
              REDLINE
            </Title>
            <Text className="rbyline">
              a game by{" "}
              <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                Eilon Agmon
              </Anchor>
            </Text>
            <Text className="rprompt">tap or click to hit the highway</Text>
            <Text className="rhint">
              arrows/WASD to steer &middot; up/W to floor it, down/S to brake &middot; Z/X to fire &middot; space to
              drop oil behind you &middot; three stages of traffic between you and the end of the route
            </Text>
          </Stack>
        )}

        {gameState === "win" && (
          <Stack className="roverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="rglow">
              ROUTE CLEARED
            </Title>
            <Text className="rprompt score">
              made it with {finalLives} {finalLives === 1 ? "life" : "lives"} left
            </Text>
            <Text className="rprompt">tap or click to run it again</Text>
          </Stack>
        )}

        {gameState === "gameover" && (
          <Stack className="roverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="rglow">
              WRECKED
            </Title>
            <Text className="rprompt">tap or click to try again</Text>
          </Stack>
        )}
      </div>

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="ridentity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
