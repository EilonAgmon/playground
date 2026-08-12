import { HEROES, XP_PER_LEVEL, LEVEL_NAMES } from "./heroes.js";

export const WHEEL_COUNT = 5;
export const MAX_SPINS = 3;
export const START_HP = 10;
export const MAX_WALL = 6;

const SYMBOL_WEIGHTS = [
  ["square", 28],
  ["diamond", 28],
  ["hammer", 28],
  ["square_xp", 8],
  ["diamond_xp", 8],
];

function randomSymbol() {
  const total = SYMBOL_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [sym, w] of SYMBOL_WEIGHTS) {
    if (r < w) return sym;
    r -= w;
  }
  return SYMBOL_WEIGHTS[0][0];
}

function createFighter(heroKey) {
  return { heroKey, level: 1, xp: 0, rod: HEROES[heroKey].rodSize };
}

function createSide(leftKey, rightKey) {
  return { crownHp: START_HP, wallHeight: 0, left: createFighter(leftKey), right: createFighter(rightKey) };
}

export function createInitialState(playerLeft, playerRight, aiLeft, aiRight) {
  return {
    phase: "playerTurn",
    spinsLeft: MAX_SPINS,
    wheels: Array.from({ length: WHEEL_COUNT }, () => ({ symbol: null, locked: false })),
    player: createSide(playerLeft, playerRight),
    ai: createSide(aiLeft, aiRight),
    log: ["Your turn — spin the wheels."],
    winner: null,
  };
}

export function spin(state) {
  if (state.spinsLeft <= 0 || state.winner) return state;
  const wheels = state.wheels.map((w) => (w.locked ? w : { ...w, symbol: randomSymbol() }));
  return { ...state, wheels, spinsLeft: state.spinsLeft - 1 };
}

export function toggleLock(state, index) {
  const wheel = state.wheels[index];
  if (!wheel || wheel.symbol == null || state.spinsLeft <= 0 || state.winner) return state;
  const wheels = state.wheels.map((w, i) => (i === index ? { ...w, locked: !w.locked } : w));
  return { ...state, wheels };
}

function tally(wheels) {
  const counts = { square: 0, diamond: 0, hammer: 0, square_xp: 0, diamond_xp: 0 };
  for (const w of wheels) {
    if (w.symbol && counts[w.symbol] != null) counts[w.symbol]++;
  }
  return counts;
}

function actionsFor(count) {
  return count >= 3 ? count - 2 : 0;
}

export function canResolve(state) {
  return !state.winner && state.wheels.some((w) => w.symbol != null);
}

export function resolveTurn(state) {
  if (!canResolve(state)) return state;

  const ownerKey = state.phase === "playerTurn" ? "player" : "ai";
  const oppKey = ownerKey === "player" ? "ai" : "player";
  const self = { ...state[ownerKey] };
  const opp = { ...state[oppKey] };
  let left = { ...self.left };
  let right = { ...self.right };
  const log = [...state.log];
  const ownerLabel = ownerKey === "player" ? "You" : "The stranger";

  const counts = tally(state.wheels);
  const squareActions = actionsFor(counts.square);
  const diamondActions = actionsFor(counts.diamond);
  const hammerActions = actionsFor(counts.hammer);

  left.rod = Math.max(0, left.rod - squareActions);
  right.rod = Math.max(0, right.rod - diamondActions);
  left.xp += counts.square_xp;
  right.xp += counts.diamond_xp;

  let wallGain = hammerActions;
  if (hammerActions > 0 && (left.heroKey === "engineer" || right.heroKey === "engineer")) {
    wallGain += 1;
  }
  self.wallHeight = Math.min(MAX_WALL, self.wallHeight + wallGain);

  function maybeLevelUp(fighter, label) {
    while (fighter.xp >= XP_PER_LEVEL && fighter.level < 3) {
      fighter.xp -= XP_PER_LEVEL;
      fighter.level += 1;
      log.push(`${ownerLabel}'s ${label} (${HEROES[fighter.heroKey].name}) reached ${LEVEL_NAMES[fighter.level - 1]}!`);
      const heal = HEROES[fighter.heroKey].healOnLevelUp;
      if (heal) self.crownHp = Math.min(START_HP, self.crownHp + heal);
    }
  }
  maybeLevelUp(left, "left hero");
  maybeLevelUp(right, "right hero");

  function maybeFire(fighter, label) {
    if (fighter.rod > 0) return;
    const heroDef = HEROES[fighter.heroKey];
    const blocked = !heroDef.alwaysHits && opp.wallHeight >= heroDef.height;
    if (blocked) {
      // A wall takes one hit for its trouble, then must be rebuilt — without
      // this, a maxed wall can stall the game forever (verified via sim).
      opp.wallHeight = 0;
      log.push(`${ownerLabel}'s ${label} (${heroDef.name}) attacks — blocked, but the wall crumbles!`);
    } else {
      opp.crownHp = Math.max(0, opp.crownHp - fighter.level);
      log.push(`${ownerLabel}'s ${label} (${heroDef.name}) hits the crown for ${fighter.level}!`);
    }
    fighter.rod = heroDef.rodSize;
  }
  maybeFire(left, "left hero");
  maybeFire(right, "right hero");

  self.left = left;
  self.right = right;

  let winner = null;
  if (opp.crownHp <= 0) {
    winner = ownerKey;
    log.push(ownerKey === "player" ? "You win!" : "The stranger wins.");
  }

  const nextPhase = winner ? "gameover" : ownerKey === "player" ? "aiTurn" : "playerTurn";
  if (!winner) log.push(nextPhase === "playerTurn" ? "Your turn — spin the wheels." : "The stranger spins...");

  return {
    ...state,
    [ownerKey]: self,
    [oppKey]: opp,
    phase: nextPhase,
    spinsLeft: MAX_SPINS,
    wheels: Array.from({ length: WHEEL_COUNT }, () => ({ symbol: null, locked: false })),
    log: log.slice(-6),
    winner,
  };
}

// Simple heuristic AI: lock anything already at 3-of-a-kind-or-better, keep
// spinning the rest, then resolve once out of spins.
export function aiChooseLocks(state) {
  const counts = tally(state.wheels);
  const worthLocking = new Set(Object.entries(counts).filter(([, c]) => c >= 3).map(([sym]) => sym));
  return state.wheels.map((w) => ({ ...w, locked: w.symbol != null && worthLocking.has(w.symbol) }));
}
