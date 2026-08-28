import { useEffect, useMemo, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { VALUES } from "./tiles.js";
import { dealNewGame, playerPlay, aiPlay, validSidesFor, pipTotal } from "./engine.js";
import { ValueIcon } from "./icons.jsx";
import "./waypoint.css";

function Half({ n }) {
  return (
    <span className="wp-half">
      <ValueIcon icon={VALUES[n].icon} />
    </span>
  );
}

function Domino({ tile, vertical = false, className = "", onClick, disabled }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`wp-tile ${vertical ? "vertical" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <Half n={tile.a} />
      <span className="wp-tile-div" />
      <Half n={tile.b} />
    </Tag>
  );
}

export default function WaypointApp() {
  const [state, setState] = useState(null);
  const [selected, setSelected] = useState(null);

  function startGame() {
    setSelected(null);
    setState(dealNewGame());
  }

  useEffect(() => {
    if (!state || state.phase !== "playing" || state.turn !== "ai") return;
    const id = setTimeout(() => setState((s) => aiPlay(s)), 750);
    return () => clearTimeout(id);
  }, [state]);

  const playableSides = useMemo(() => {
    if (!state || state.turn !== "player") return [];
    return state.playerHand.map((t) => validSidesFor(t, state.chain));
  }, [state]);

  function handleTileTap(i) {
    if (!state || state.phase !== "playing" || state.turn !== "player") return;
    const sides = playableSides[i];
    if (!sides || sides.length === 0) return;
    if (sides.length === 1) {
      setState((s) => playerPlay(s, i, sides[0]));
      setSelected(null);
      return;
    }
    setSelected((prev) => (prev === i ? null : i));
  }

  function handleEndTap(side) {
    if (selected === null) return;
    setState((s) => playerPlay(s, selected, side));
    setSelected(null);
  }

  const inGame = state && (state.phase === "playing" || state.phase === "gameover");

  return (
    <>
      <Header title="Waypoint" />
      <div id="waypoint">
        <div className="wp-hero fade-up">
          <h1 className="display-font wp-title">Waypoint</h1>
          <p className="wp-sub">Dominoes, stamped with a passport instead of pips. Match an end, or draw until you can.</p>
        </div>

        {!inGame && (
          <div className="wp-intro surface fade-up">
            <p>Standard double-six rules, one opponent. Highest double leads off; run out of tiles first, or hold the fewest pips if the route closes, and you win.</p>
            <button className="wp-btn" onClick={startGame}>
              Deal me in
            </button>
          </div>
        )}

        {inGame && (
          <div className="wp-board surface fade-up">
            <div className="wp-status">
              {state.phase === "playing"
                ? state.turn === "player"
                  ? "Your move"
                  : "Waypoint is thinking…"
                : state.blocked
                  ? state.winner
                    ? `Route closed — ${state.winner === "player" ? "you" : "Waypoint"} win on pips`
                    : "Route closed — it's a draw"
                  : state.winner === "player"
                    ? "You cleared your hand — you win!"
                    : "Waypoint cleared its hand — it wins"}
            </div>

            <div className="wp-ai-row">
              <span className="wp-label">Waypoint</span>
              <div className="wp-facedown">
                {state.aiHand.map((_, i) => (
                  <div key={i} className="wp-tile wp-tile-back vertical" />
                ))}
              </div>
              <span className="wp-count">{state.aiHand.length} left</span>
            </div>

            <div className="wp-chain-wrap">
              {state.chain.length > 0 && (
                <button
                  className={`wp-end wp-end-left ${selected !== null && playableSides[selected]?.includes("left") ? "active" : ""}`}
                  onClick={() => handleEndTap("left")}
                  disabled={selected === null || !playableSides[selected]?.includes("left")}
                  aria-label="Place on left end"
                />
              )}
              <div className="wp-chain">
                {state.chain.length === 0 && <p className="wp-chain-empty">Play any tile to open the route.</p>}
                {state.chain.map((t, i) => (
                  <Domino key={i} tile={t} />
                ))}
              </div>
              {state.chain.length > 0 && (
                <button
                  className={`wp-end wp-end-right ${selected !== null && playableSides[selected]?.includes("right") ? "active" : ""}`}
                  onClick={() => handleEndTap("right")}
                  disabled={selected === null || !playableSides[selected]?.includes("right")}
                  aria-label="Place on right end"
                />
              )}
            </div>

            <div className="wp-boneyard">Boneyard: {state.boneyard.length}</div>

            <div className="wp-hand-row">
              <span className="wp-label">You</span>
              <div className="wp-hand">
                {state.playerHand.map((t, i) => (
                  <Domino
                    key={t.id}
                    tile={t}
                    vertical
                    className={`${playableSides[i]?.length ? "playable" : ""} ${selected === i ? "selected" : ""}`}
                    onClick={state.turn === "player" && playableSides[i]?.length ? () => handleTileTap(i) : undefined}
                    disabled={!(state.turn === "player" && playableSides[i]?.length)}
                  />
                ))}
              </div>
            </div>

            {selected !== null && playableSides[selected]?.length === 2 && (
              <p className="wp-hint">Tap the left or right end of the route to place it.</p>
            )}

            {state.phase === "gameover" && (
              <div className="wp-gameover">
                <p>
                  Your pips: {pipTotal(state.playerHand)} &middot; Waypoint's pips: {pipTotal(state.aiHand)}
                </p>
                <button className="wp-btn" onClick={startGame}>
                  Play again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
