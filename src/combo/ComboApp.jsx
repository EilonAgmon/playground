import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createComboEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./combo.css";

export default function ComboApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [finalLines, setFinalLines] = useState(0);

  useEffect(() => {
    const engine = createComboEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && typeof extra.score === "number") setFinalScore(extra.score);
        if (extra && typeof extra.level === "number") setFinalLevel(extra.level);
        if (extra && typeof extra.lines === "number") setFinalLines(extra.lines);
      },
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  function handleStart() {
    engineRef.current && engineRef.current.startOrRestart();
  }

  function holdSoftDrop(on) {
    return (e) => {
      e.preventDefault();
      engineRef.current?.setSoftDrop(on);
    };
  }

  return (
    <div id="cbstage">
      <Header floating />
      <div className="cbviewport">
        <canvas id="cbgame" ref={canvasRef} />

        {gameState === "playing" && (
          <div className="cbtouch" aria-hidden="true">
            <div className="cbsteer">
              <button
                className="cbbtn cbleft"
                onPointerDown={(e) => {
                  e.preventDefault();
                  engineRef.current?.tryMove(-1);
                }}
              />
              <button
                className="cbbtn cbsoft"
                onPointerDown={holdSoftDrop(true)}
                onPointerUp={holdSoftDrop(false)}
                onPointerLeave={holdSoftDrop(false)}
                onPointerCancel={holdSoftDrop(false)}
              />
              <button
                className="cbbtn cbright"
                onPointerDown={(e) => {
                  e.preventDefault();
                  engineRef.current?.tryMove(1);
                }}
              />
            </div>
            <div className="cbactions">
              <button
                className="cbbtn cbrotate"
                onPointerDown={(e) => {
                  e.preventDefault();
                  engineRef.current?.tryRotate();
                }}
              >
                ROTATE
              </button>
              <button
                className="cbbtn cbdrop"
                onPointerDown={(e) => {
                  e.preventDefault();
                  engineRef.current?.hardDrop();
                }}
              >
                DROP
              </button>
            </div>
          </div>
        )}

        {gameState === "title" && (
          <Stack className="cboverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="cbglow">
              COMBO
            </Title>
            <Text className="cbbyline">
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
            <Text className="cbprompt">tap or click to launch</Text>
            <Text className="cbhint">
              arrows/WASD to move &middot; up to rotate &middot; down to soft-drop &middot; space to hard-drop
              &middot; seven fast-food pieces, clear lines, don't top out
            </Text>
          </Stack>
        )}

        {gameState === "gameover" && (
          <Stack className="cboverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="cbglow">
              ORDER'S UP
            </Title>
            <Text className="cbprompt score">
              score {finalScore} &middot; level {finalLevel} &middot; {finalLines} lines
            </Text>
            <Text className="cbprompt">tap or click to try again</Text>
          </Stack>
        )}
      </div>

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="cbidentity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
