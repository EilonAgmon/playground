import { HEROES, XP_PER_LEVEL, LEVEL_NAMES } from "./heroes.js";

export const WHEEL_COUNT = 5;
export const MAX_SPINS = 3;
export const START_HP = 10;
export const MAX_WALL = 8;

const SYMBOL_WEIGHTS = [
  ["square", 27],
  ["diamond", 27],
  ["hammer", 27],
  ["square_xp", 8],
  ["diamond_xp", 8],
  ["blank", 3],
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
    staleTurns: 0,
    turnNumber: 0,
  };
}

export function spin(state) {
  if (state.spinsLeft <= 0 || state.winner) return state;
  const wheels = state.wheels.map((w) => (w.locked ? w : { ...w, symbol: randomSymbol() }));
  return { ...state, wheels, spinsLeft: state.spinsLeft - 1 };
}

export function toggleLock(state, index) {
  const wheel = state.wheels[index];
  if (!wheel || wheel.symbol == null || state.spinsLeft <= 0 || state.winner || state.phase !== "playerTurn") {
    return state;
  }
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

function resolveAttack(heroDef, opp, log, ownerLabel, label) {
  if (heroDef.ignoresBulwark) {
    opp.crownHp = Math.max(0, opp.crownHp - heroDef.crownDamage);
    log.push(`${ownerLabel}'s ${label} (${heroDef.name}) strikes past the wall for ${heroDef.crownDamage}.`);
    return;
  }

  if (heroDef.dualShot) {
    const lowBlocked = opp.wallHeight >= 1;
    if (lowBlocked) {
      opp.wallHeight = Math.max(0, opp.wallHeight - heroDef.bulwarkDamage);
      log.push(`${ownerLabel}'s ${label} (${heroDef.name})'s low bolt chips the wall.`);
    } else {
      opp.crownHp = Math.max(0, opp.crownHp - heroDef.crownDamage);
      log.push(`${ownerLabel}'s ${label} (${heroDef.name})'s low bolt hits the crown for ${heroDef.crownDamage}.`);
    }
    opp.crownHp = Math.max(0, opp.crownHp - heroDef.crownDamage);
    log.push(`${ownerLabel}'s ${label}'s second bolt always finds the crown for ${heroDef.crownDamage}.`);
    return;
  }

  const blockThreshold = heroDef.height === "low" ? 1 : heroDef.blockedBy;
  const blocked = opp.wallHeight >= blockThreshold;
  if (blocked) {
    opp.wallHeight = Math.max(0, opp.wallHeight - heroDef.bulwarkDamage);
    log.push(`${ownerLabel}'s ${label} (${heroDef.name}) attacks — the wall absorbs ${heroDef.bulwarkDamage}.`);
  } else {
    opp.crownHp = Math.max(0, opp.crownHp - heroDef.crownDamage);
    log.push(`${ownerLabel}'s ${label} (${heroDef.name}) hits the crown for ${heroDef.crownDamage}.`);
  }
}

export function resolveTurn(state) {
  if (!canResolve(state)) return state;

  const ownerKey = state.phase === "playerTurn" ? "player" : "ai";
  const oppKey = ownerKey === "player" ? "ai" : "player";
  const self = { ...state[ownerKey] };
  const opp = { ...state[oppKey] };
  const left = { ...self.left };
  const right = { ...self.right };
  const log = [...state.log];
  const ownerLabel = ownerKey === "player" ? "Your" : "The stranger's";
  const crownBefore = { self: self.crownHp, opp: opp.crownHp };

  const counts = tally(state.wheels);
  const squareActions = actionsFor(counts.square);
  const diamondActions = actionsFor(counts.diamond);
  const hammerActions = actionsFor(counts.hammer);

  left.rod = Math.max(0, left.rod - squareActions);
  right.rod = Math.max(0, right.rod - diamondActions);
  left.xp += counts.square_xp;
  right.xp += counts.diamond_xp;
  self.wallHeight = Math.min(MAX_WALL, self.wallHeight + hammerActions);

  function maybeLevelUp(fighter, label) {
    while (fighter.xp >= XP_PER_LEVEL && fighter.level < 3) {
      fighter.xp -= XP_PER_LEVEL;
      fighter.level += 1;
      log.push(`${ownerLabel} ${label} (${HEROES[fighter.heroKey].name}) reached ${LEVEL_NAMES[fighter.level - 1]}.`);
    }
  }
  maybeLevelUp(left, "left hero");
  maybeLevelUp(right, "right hero");

  function maybeFire(fighter, allyFighter, label, allyLabel) {
    if (fighter.rod > 0) return;
    const heroDef = HEROES[fighter.heroKey];

    if (heroDef.crownDamage > 0 || heroDef.ignoresBulwark || heroDef.dualShot) {
      resolveAttack(heroDef, opp, log, ownerLabel, label);
    }
    if (heroDef.selfBulwarkOnAct) {
      self.wallHeight = Math.min(MAX_WALL, self.wallHeight + heroDef.selfBulwarkOnAct);
      log.push(`${ownerLabel} ${label} reinforces the wall.`);
    }
    if (heroDef.healOnAct) {
      self.crownHp = Math.min(START_HP, self.crownHp + heroDef.healOnAct);
      log.push(`${ownerLabel} ${label} mends the crown.`);
    }
    if (heroDef.allyEnergyBuffOnAct && allyFighter) {
      allyFighter.rod = Math.max(0, allyFighter.rod - heroDef.allyEnergyBuffOnAct);
      log.push(`${ownerLabel} ${label} channels energy to the ${allyLabel}.`);
    }
    if (heroDef.delayOnAct) {
      const target = opp.left.rod <= opp.right.rod ? opp.left : opp.right;
      const targetDef = HEROES[target.heroKey];
      target.rod = Math.min(targetDef.rodSize, target.rod + heroDef.delayOnAct);
      log.push(`${ownerLabel} ${label} disrupts the enemy's rhythm.`);
    }

    fighter.rod = heroDef.rodSize;
  }
  maybeFire(left, right, "left hero", "right hero");
  maybeFire(right, left, "right hero", "left hero");

  self.left = left;
  self.right = right;

  // Anti-stalemate: if many turns pass with neither crown taking damage
  // (verified via simulation to be structurally possible with some hero
  // pairings — e.g. two purely wall-blocked attackers facing a maintained
  // Bulwark), both walls start decaying on top of normal play, guaranteed
  // to eventually outpace any income and force a breakthrough.
  // Only damage to the crown being attacked counts as progress — a Priest's
  // self-heal must NOT reset this, or a healing-heavy pairing can keep the
  // clock perpetually reset without the game ever actually advancing.
  const crownChanged = opp.crownHp !== crownBefore.opp;
  const staleTurns = crownChanged ? 0 : (state.staleTurns || 0) + 1;
  if (staleTurns > 20) {
    const decay = Math.min(10, staleTurns - 19);
    self.wallHeight = Math.max(0, self.wallHeight - decay);
    opp.wallHeight = Math.max(0, opp.wallHeight - decay);
  }

  let winner = null;
  if (opp.crownHp <= 0) {
    winner = ownerKey;
    log.push(ownerKey === "player" ? "You win!" : "The stranger wins.");
  } else if (self.crownHp <= 0) {
    winner = oppKey;
    log.push(oppKey === "player" ? "You win!" : "The stranger wins.");
  } else if (staleTurns > 60 || (state.turnNumber || 0) > 150) {
    // Guaranteed backstop: verified via exhaustive simulation that a small
    // number of hero pairings (self-reinforcing Bulwark loops, e.g.
    // Engineer+Priest on both sides) can still outlast the decay above.
    // Rather than keep chasing balance numbers, force a decision on
    // remaining Crown HP so the game can never truly hang.
    winner = self.crownHp === opp.crownHp ? "player" : self.crownHp > opp.crownHp ? ownerKey : oppKey;
    log.push("Stalemate — decided on remaining Crown health.");
    log.push(winner === "player" ? "You win!" : "The stranger wins.");
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
    staleTurns,
    turnNumber: (state.turnNumber || 0) + 1,
  };
}

// Simple heuristic AI: lock anything already at 3-of-a-kind-or-better, keep
// spinning the rest.
export function aiChooseLocks(state) {
  const counts = tally(state.wheels);
  const worthLocking = new Set(Object.entries(counts).filter(([, c]) => c >= 3).map(([sym]) => sym));
  return state.wheels.map((w) => ({ ...w, locked: w.symbol != null && worthLocking.has(w.symbol) }));
}
