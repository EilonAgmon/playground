import { fullSet } from "./tiles.js";

// Pure state machine, no rendering/timers — same convention as Wick/HQ/
// Roster. A "move" is either placing a tile at an open end or (handled
// automatically inside afterPlacement) drawing from the boneyard when a
// hand has nothing playable.

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chainEnds(chain) {
  if (chain.length === 0) return { left: null, right: null };
  return { left: chain[0].a, right: chain[chain.length - 1].b };
}

// Orients a tile so its matching value touches the existing end and the
// other value becomes the new open end. Returns null if it doesn't fit.
function orientForRight(tile, rightEnd) {
  if (rightEnd === null) return { a: tile.a, b: tile.b };
  if (tile.a === rightEnd) return { a: tile.a, b: tile.b };
  if (tile.b === rightEnd) return { a: tile.b, b: tile.a };
  return null;
}
function orientForLeft(tile, leftEnd) {
  if (leftEnd === null) return { a: tile.a, b: tile.b };
  if (tile.b === leftEnd) return { a: tile.a, b: tile.b };
  if (tile.a === leftEnd) return { a: tile.b, b: tile.a };
  return null;
}

export function validSidesFor(tile, chain) {
  if (chain.length === 0) return ["right"];
  const { left, right } = chainEnds(chain);
  const sides = [];
  if (orientForLeft(tile, left)) sides.push("left");
  if (orientForRight(tile, right)) sides.push("right");
  return sides;
}

export function hasValidMove(hand, chain) {
  return hand.some((t) => validSidesFor(t, chain).length > 0);
}

export function pipTotal(hand) {
  return hand.reduce((s, t) => s + t.a + t.b, 0);
}

const OTHER = { player: "ai", ai: "player" };
const HAND_KEY = { player: "playerHand", ai: "aiHand" };

function highestStarter(hand) {
  const doubles = hand.filter((t) => t.a === t.b).sort((x, y) => y.a - x.a);
  if (doubles.length) return { isDouble: true, value: doubles[0].a };
  const best = [...hand].sort((x, y) => y.a + y.b - (x.a + x.b))[0];
  return { isDouble: false, value: best.a + best.b };
}
function starterBeats(a, b) {
  if (a.isDouble && !b.isDouble) return true;
  if (!a.isDouble && b.isDouble) return false;
  return a.value >= b.value;
}

export function dealNewGame() {
  const deck = shuffle(fullSet());
  const playerHand = deck.splice(0, 7);
  const aiHand = deck.splice(0, 7);
  const boneyard = deck;
  const turn = starterBeats(highestStarter(playerHand), highestStarter(aiHand)) ? "player" : "ai";
  return {
    phase: "playing",
    playerHand,
    aiHand,
    boneyard,
    chain: [],
    turn,
    winner: null,
    blocked: false,
  };
}

function applyPlacement(state, mover, tileIndex, side) {
  const handKey = HAND_KEY[mover];
  const hand = state[handKey];
  const tile = hand[tileIndex];
  const { left, right } = chainEnds(state.chain);
  let oriented;
  if (state.chain.length === 0) oriented = { a: tile.a, b: tile.b };
  else if (side === "left") oriented = orientForLeft(tile, left);
  else oriented = orientForRight(tile, right);
  if (!oriented) return state;

  const newHand = hand.filter((_, i) => i !== tileIndex);
  const newChain =
    state.chain.length === 0
      ? [oriented]
      : side === "left"
        ? [oriented, ...state.chain]
        : [...state.chain, oriented];
  return { ...state, [handKey]: newHand, chain: newChain };
}

function drawUntilPlayableOrEmpty(state, whoseHand) {
  const handKey = HAND_KEY[whoseHand];
  let boneyard = state.boneyard;
  let hand = state[handKey];
  while (boneyard.length > 0 && !hasValidMove(hand, state.chain)) {
    hand = [...hand, boneyard[boneyard.length - 1]];
    boneyard = boneyard.slice(0, -1);
  }
  return { ...state, [handKey]: hand, boneyard };
}

// Resolves everything after a tile is placed: win check, then hands off
// to the opponent (auto-drawing them up to a playable tile or an empty
// boneyard), then either leaves it as the opponent's turn, ends the game
// as fully blocked (scored by lowest pip total), or passes back to
// whoever just moved if the opponent is stuck but the mover isn't.
function afterPlacement(state, mover) {
  if (state[HAND_KEY[mover]].length === 0) {
    return { ...state, phase: "gameover", winner: mover, blocked: false };
  }
  const opponent = OTHER[mover];
  let s = drawUntilPlayableOrEmpty({ ...state, turn: opponent }, opponent);
  if (hasValidMove(s[HAND_KEY[opponent]], s.chain)) return s;

  if (!hasValidMove(s[HAND_KEY[mover]], s.chain)) {
    const pMover = pipTotal(s[HAND_KEY[mover]]);
    const pOpp = pipTotal(s[HAND_KEY[opponent]]);
    const winner = pMover === pOpp ? null : pMover < pOpp ? mover : opponent;
    return { ...s, phase: "gameover", winner, blocked: true };
  }
  return { ...s, turn: mover };
}

export function playerPlay(state, tileIndex, side) {
  if (state.phase !== "playing" || state.turn !== "player") return state;
  const tile = state.playerHand[tileIndex];
  if (!tile) return state;
  if (!validSidesFor(tile, state.chain).includes(side)) return state;
  return afterPlacement(applyPlacement(state, "player", tileIndex, side), "player");
}

function aiChooseMove(state) {
  const options = [];
  state.aiHand.forEach((tile, i) => {
    for (const side of validSidesFor(tile, state.chain)) options.push({ i, side });
  });
  if (options.length === 0) return null;
  options.sort((x, y) => {
    const tx = state.aiHand[x.i];
    const ty = state.aiHand[y.i];
    const dx = tx.a === tx.b ? 1 : 0;
    const dy = ty.a === ty.b ? 1 : 0;
    if (dx !== dy) return dy - dx;
    return ty.a + ty.b - (tx.a + tx.b);
  });
  return options[0];
}

export function aiPlay(state) {
  if (state.phase !== "playing" || state.turn !== "ai") return state;
  const move = aiChooseMove(state);
  if (!move) return state;
  return afterPlacement(applyPlacement(state, "ai", move.i, move.side), "ai");
}
