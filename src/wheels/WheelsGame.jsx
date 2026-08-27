import { useEffect, useRef, useState } from "react";
import { Stack, Group, Title, Text, Button } from "@mantine/core";
import { LEVEL_NAMES } from "./heroes.js";
import { MAX_WALL } from "./engine.js";
import { SquareSymbol, DiamondSymbol, HammerSymbol, BlankSymbol, ChargeIcon, TowerIcon, HeroGlyph } from "./WheelIcons.jsx";
import { Header } from "../shared/Header.jsx";

function StatBox({ icon, value }) {
  return (
    <span className="statBox">
      {icon}
      {value}
    </span>
  );
}

function HeroPortal({ fighter, position, active }) {
  const gem = position.endsWith("left") ? "orange" : "teal";
  return (
    <div className={`heroPortal ${position} ${active ? "active" : ""}`}>
      <span className={`portalGem gem-${gem}`} />
      <div className="portalDais">
        <HeroGlyph heroKey={fighter.heroKey} size={38} />
      </div>
      <span className="portalLevel">{LEVEL_NAMES[fighter.level - 1]}</span>
      <div className="portalStats">
        <StatBox icon={<ChargeIcon size={11} />} value={fighter.rod} />
      </div>
    </div>
  );
}

// The wall/bulwark is a per-side stat (not per-hero), so it gets one shared,
// always-visible meter next to each side's crown — including the AI's,
// which previously only showed up as a tiny number buried in a hero's stat
// row and was easy to miss entirely.
function WallMeter({ height, label }) {
  const segments = Array.from({ length: MAX_WALL }, (_, i) => i < height);
  return (
    <div className="wallMeter" aria-label={`${label} wall: ${height} of ${MAX_WALL}`}>
      <TowerIcon size={12} />
      <div className="wallSegments">
        {segments.map((filled, i) => (
          <span key={i} className={`wallSeg ${filled ? "filled" : ""}`} />
        ))}
      </div>
    </div>
  );
}

function CrownBadge({ value, active }) {
  const [damaged, setDamaged] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value < prevValue.current) {
      setDamaged(true);
      const t = setTimeout(() => setDamaged(false), 400);
      prevValue.current = value;
      return () => clearTimeout(t);
    }
    prevValue.current = value;
  }, [value]);

  return (
    <div className="crownBadgeWrap">
      <span className="crownBadgeGem" />
      <div className={`crownBadge ${active ? "active" : ""} ${damaged ? "damaged" : ""}`}>
        <span className="crownBadgeValue">{String(value).padStart(2, "0")}</span>
      </div>
    </div>
  );
}

function WheelTile({ wheel, index, onClick, interactive, spinGen }) {
  const symbol = wheel.symbol;
  return (
    <div
      className={`wheelTile ${wheel.locked ? "locked" : ""} ${interactive ? "interactive" : ""}`}
      onClick={() => interactive && onClick(index)}
    >
      <div className="wheelInner" key={spinGen}>
        {symbol === null && <span className="wheelBlank">?</span>}
        {symbol === "blank" && <BlankSymbol size={26} />}
        {symbol === "square" && <SquareSymbol size={26} />}
        {symbol === "diamond" && <DiamondSymbol size={26} />}
        {symbol === "hammer" && <HammerSymbol size={26} />}
        {symbol === "square_xp" && <SquareSymbol size={26} xp />}
        {symbol === "diamond_xp" && <DiamondSymbol size={26} xp />}
      </div>
      {wheel.locked && <span className="lockBadge">&#9679;</span>}
    </div>
  );
}

export default function WheelsGame({ state, onSpin, onToggleLock, onResolve, onRestart }) {
  const isPlayerTurn = state.phase === "playerTurn";
  const canSpin = isPlayerTurn && state.spinsLeft > 0 && !state.winner;
  const hasResult = state.wheels.some((w) => w.symbol != null);
  const canResolveNow = isPlayerTurn && hasResult && !state.winner;
  const spinGen = `${state.phase}-${state.spinsLeft}`;

  return (
    <div id="wheels">
      <Header floating />
      <div className="wheelsTable">
        <Title order={1} className="wheelsTitle">
          WHEELS
        </Title>

        <div className="boardGrid">
          <HeroPortal fighter={state.ai.left} position="top-left" active={!isPlayerTurn && !state.winner} />
          <div className={`centerColumn ${!isPlayerTurn && !state.winner ? "activeTurn" : ""}`}>
            <div className="crownStack">
              <CrownBadge value={state.ai.crownHp} active={!isPlayerTurn && !state.winner} />
              <WallMeter height={state.ai.wallHeight} label="Opponent" />
            </div>
            <div className="wheelRow">
              {state.wheels.map((w, i) => (
                <WheelTile
                  key={i}
                  wheel={w}
                  index={i}
                  onClick={onToggleLock}
                  interactive={isPlayerTurn && state.spinsLeft > 0 && w.symbol != null}
                  spinGen={spinGen}
                />
              ))}
            </div>
            <div className="crownStack">
              <WallMeter height={state.player.wallHeight} label="Your" />
              <CrownBadge value={state.player.crownHp} active={isPlayerTurn && !state.winner} />
            </div>
          </div>
          <HeroPortal fighter={state.ai.right} position="top-right" active={!isPlayerTurn && !state.winner} />

          <HeroPortal fighter={state.player.left} position="bottom-left" active={isPlayerTurn && !state.winner} />
          <div className="centerSpacer" />
          <HeroPortal fighter={state.player.right} position="bottom-right" active={isPlayerTurn && !state.winner} />
        </div>

        <Group gap="xs" className="wheelActions">
          <Button size="xs" className="wheelsBtn" disabled={!canSpin} onClick={onSpin}>
            spin ({state.spinsLeft} left)
          </Button>
          <Button size="xs" variant="outline" className="wheelsBtnOutline" disabled={!canResolveNow} onClick={onResolve}>
            bank it
          </Button>
        </Group>

        <div className="wheelsLog">
          <Text size="xs">{state.log[state.log.length - 1]}</Text>
        </div>
      </div>

      {state.winner && (
        <Stack className="wheelsOverlay" align="center" justify="center" gap="sm">
          <Title order={1} className="wheelsTitle">
            {state.winner === "player" ? "YOU WIN" : "YOU LOSE"}
          </Title>
          <Button className="wheelsBtn" onClick={onRestart}>
            play again
          </Button>
        </Stack>
      )}
    </div>
  );
}
