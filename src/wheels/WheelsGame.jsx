import { Stack, Group, Title, Text, Button } from "@mantine/core";
import { HEROES, LEVEL_NAMES } from "./heroes.js";
import { SquareSymbol, DiamondSymbol, HammerSymbol, BlankSymbol, CrownIcon, WallBrick, HeroGlyph } from "./WheelIcons.jsx";

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
      <HeroGlyph heroKey={fighter.heroKey} size={26} />
      <div className="fighterMeta">
        <span className="fighterLevel">{LEVEL_NAMES[fighter.level - 1]}</span>
        <RodPips rod={fighter.rod} rodSize={heroDef.rodSize} />
      </div>
    </div>
  );
}

function SidePanel({ side, name, isTurn }) {
  return (
    <div className={`sidePanel ${isTurn ? "activeTurn" : ""}`}>
      <div className="sidePanelHeader">
        <CrownIcon size={26} />
        <span className="crownHp">{side.crownHp}</span>
        <span className="sideName">{name}</span>
      </div>
      <div className="wallRow">
        <span className="wallLabel">wall</span>
        <div className="wallBricks">
          {Array.from({ length: side.wallHeight }).map((_, i) => (
            <WallBrick key={i} size={10} />
          ))}
        </div>
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
        {symbol === "blank" && <BlankSymbol size={28} />}
        {symbol === "square" && <SquareSymbol size={28} />}
        {symbol === "diamond" && <DiamondSymbol size={28} />}
        {symbol === "hammer" && <HammerSymbol size={28} />}
        {symbol === "square_xp" && <SquareSymbol size={28} xp />}
        {symbol === "diamond_xp" && <DiamondSymbol size={28} xp />}
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
      <div className="wheelsTable">
        <Title order={1} className="wheelsTitle">
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
              spinGen={spinGen}
            />
          ))}
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

      <a href="../" className="back">
        &larr; back to the portal
      </a>
    </div>
  );
}
