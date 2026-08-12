import { Stack, Group, Title, Text, Button } from "@mantine/core";
import { HEROES, LEVEL_NAMES } from "./heroes.js";
import { MAX_WALL } from "./engine.js";
import { SquareSymbol, DiamondSymbol, HammerSymbol, CrownIcon, HeroGlyph } from "./WheelIcons.jsx";

function RodPips({ rod, rodSize }) {
  const filled = rodSize - rod;
  return (
    <span className="rodPips">
      {Array.from({ length: rodSize }).map((_, i) => (
        <span key={i} className={`rodPip ${i < filled ? "filled" : ""}`} />
      ))}
    </span>
  );
}

function FighterRow({ fighter }) {
  const heroDef = HEROES[fighter.heroKey];
  return (
    <div className="fighterRow">
      <HeroGlyph heroKey={fighter.heroKey} size={20} />
      <span className="fighterLevel">{LEVEL_NAMES[fighter.level - 1][0]}</span>
      <RodPips rod={fighter.rod} rodSize={heroDef.rodSize} />
    </div>
  );
}

function SidePanel({ side, name, isTurn }) {
  return (
    <div className={`sidePanel ${isTurn ? "activeTurn" : ""}`}>
      <div className="sidePanelHeader">
        <CrownIcon size={18} color="var(--mantine-color-brand-4)" />
        <span className="crownHp">{side.crownHp}</span>
        <span className="sideName">{name}</span>
      </div>
      <div className="wallRow">
        <span className="wallLabel">wall</span>
        <div className="wallBar">
          <div className="wallFill" style={{ width: `${(side.wallHeight / MAX_WALL) * 100}%` }} />
        </div>
        <span className="wallValue">{side.wallHeight}</span>
      </div>
      <FighterRow fighter={side.left} />
      <FighterRow fighter={side.right} />
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
        {symbol === "square" && <SquareSymbol size={30} />}
        {symbol === "diamond" && <DiamondSymbol size={30} />}
        {symbol === "hammer" && <HammerSymbol size={30} />}
        {symbol === "square_xp" && <SquareSymbol size={30} xp />}
        {symbol === "diamond_xp" && <DiamondSymbol size={30} xp />}
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
    <Stack id="wheels" align="center" gap="sm">
      <Title order={1} className="glow small">
        WHEELS
      </Title>

      <div className="sidePanels">
        <SidePanel side={state.player} name="You" isTurn={isPlayerTurn && !state.winner} />
        <SidePanel side={state.ai} name="Stranger" isTurn={!isPlayerTurn && !state.winner} />
      </div>

      <div className="wheelRow">
        {state.wheels.map((w, i) => (
          <WheelTile
            key={i}
            wheel={w}
            index={i}
            onClick={onToggleLock}
            interactive={isPlayerTurn && state.spinsLeft > 0 && w.symbol != null}
            spinGen={`${spinGen}`}
          />
        ))}
      </div>

      <Group gap="xs" className="wheelActions">
        <Button size="xs" disabled={!canSpin} onClick={onSpin}>
          spin ({state.spinsLeft} left)
        </Button>
        <Button size="xs" variant="outline" disabled={!canResolveNow} onClick={onResolve}>
          bank it
        </Button>
      </Group>

      <div className="wheelsLog">
        <Text size="xs">{state.log[state.log.length - 1]}</Text>
      </div>

      {state.winner && (
        <Stack className="wheelsOverlay" align="center" justify="center" gap="sm">
          <Title order={1} className="glow">
            {state.winner === "player" ? "YOU WIN" : "YOU LOSE"}
          </Title>
          <Button onClick={onRestart}>play again</Button>
        </Stack>
      )}

      <a href="../" className="back">
        &larr; back to the portal
      </a>
    </Stack>
  );
}
