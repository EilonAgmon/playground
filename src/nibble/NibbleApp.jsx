import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createNibbleEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./nibble.css";

export default function NibbleApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);

  useEffect(() => {
    const engine = createNibbleEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && typeof extra.score === "number") setFinalScore(extra.score);
        if (extra && typeof extra.level === "number") setFinalLevel(extra.level);
      },
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  function handleStart() {
    engineRef.current && engineRef.current.startOrRestart();
  }

  function tapDir(name) {
    return (e) => {
      e.preventDefault();
      engineRef.current?.setDir(name);
    };
  }

  return (
    <div id="nbstage">
      <Header floating />
      <div className="nbviewport">
        <canvas id="nbgame" ref={canvasRef} />

        {gameState === "playing" && (
          <div className="nbtouch" aria-hidden="true">
            <div className="nbdpad">
              <button className="nbdbtn nbup" onPointerDown={tapDir("up")} />
              <button className="nbdbtn nbleft" onPointerDown={tapDir("left")} />
              <button className="nbdbtn nbright" onPointerDown={tapDir("right")} />
              <button className="nbdbtn nbdown" onPointerDown={tapDir("down")} />
            </div>
          </div>
        )}

        {gameState === "title" && (
          <Stack className="nboverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="nbglow">
              NIBBLE
            </Title>
            <Text className="nbbyline">
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
            <Text className="nbprompt">tap or click to launch</Text>
            <Text className="nbhint">
              arrows/WASD or the d-pad to move &middot; clear every dot to advance &middot; power pellets turn the
              hunters into the hunted, for a few seconds
            </Text>
          </Stack>
        )}

        {gameState === "gameover" && (
          <Stack className="nboverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="nbglow">
              CORNERED
            </Title>
            <Text className="nbprompt score">
              score {finalScore} &middot; level {finalLevel}
            </Text>
            <Text className="nbprompt">tap or click to try again</Text>
          </Stack>
        )}
      </div>

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="nbidentity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
