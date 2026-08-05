import { useEffect, useRef, useState } from "react";
import { createPongEngine } from "./engine.js";
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
      <canvas id="game" ref={canvasRef} />

      {gameState === "title" && (
        <div className="overlay" onClick={handleStart}>
          <h1 className="glow display-font">PONG</h1>
          <p className="byline">
            a game by{" "}
            <a href="https://github.com/EilonAgmon" target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
              Eilon Agmon
            </a>
          </p>
          <p className="prompt">tap or click to serve</p>
          <p className="hint">move your paddle with mouse, touch-drag, or arrow keys &middot; first to 11 wins</p>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="overlay" onClick={handleStart}>
          <h1 className="glow display-font">{gameOverText}</h1>
          <p className="prompt">tap or click to play again</p>
        </div>
      )}

      <footer id="identity">
        <a href="https://github.com/EilonAgmon" target="_blank" rel="noopener">
          github.com/EilonAgmon
        </a>
      </footer>
    </div>
  );
}
