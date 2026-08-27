import { useEffect, useRef, useState } from "react";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { createShatterEngine } from "./engine.js";
import { Header } from "../shared/Header.jsx";
import "./shatter.css";

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

export default function ShatterApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const [finalScore, setFinalScore] = useState(0);
  const [finalWave, setFinalWave] = useState(1);

  useEffect(() => {
    const engine = createShatterEngine(canvasRef.current, {
      onState(state, extra) {
        setGameState(state);
        if (extra && typeof extra.score === "number") setFinalScore(extra.score);
        if (extra && typeof extra.wave === "number") setFinalWave(extra.wave);
      },
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  function handleStart() {
    engineRef.current && engineRef.current.startOrRestart();
  }

  return (
    <div id="shstage">
      <Header floating />
      <div className="shviewport">
        <canvas id="shgame" ref={canvasRef} />

        {gameState === "playing" && (
          <div className="shtouch" aria-hidden="true">
            <div className="shturn">
              <button className="shbtn shleft" {...bindHold(engineRef, "left")}>
                ◁
              </button>
              <button className="shbtn shright" {...bindHold(engineRef, "right")}>
                ▷
              </button>
            </div>
            <div className="shactions">
              <button className="shbtn shthrust" {...bindHold(engineRef, "thrust")}>
                THRUST
              </button>
              <button className="shbtn shfire" {...bindHold(engineRef, "fire")}>
                FIRE
              </button>
            </div>
          </div>
        )}

        {gameState === "title" && (
          <Stack className="shoverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="shglow">
              SHATTER
            </Title>
            <Text className="shbyline">
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
            <Text className="shprompt">tap or click to launch</Text>
            <Text className="shhint">
              arrows/WASD or ◁▷ to turn &middot; up/W or THRUST to burn &middot; space/Z/X or FIRE to shoot &middot;
              rocks split when hit — survive as many waves as you can
            </Text>
          </Stack>
        )}

        {gameState === "gameover" && (
          <Stack className="shoverlay" align="center" justify="center" gap="sm" onClick={handleStart}>
            <Title order={1} className="shglow">
              LOST IN THE FIELD
            </Title>
            <Text className="shprompt score">
              score {finalScore} &middot; wave {finalWave}
            </Text>
            <Text className="shprompt">tap or click to fly again</Text>
          </Stack>
        )}
      </div>

      <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="shidentity" underline="hover">
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
