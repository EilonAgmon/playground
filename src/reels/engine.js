export const SYMBOLS = [
  { key: "wheat", name: "Wheat", weight: 30, payout: 3 },
  { key: "sun", name: "Sun", weight: 26, payout: 4 },
  { key: "tractor", name: "Tractor", weight: 18, payout: 8 },
  { key: "apple", name: "Golden Apple", weight: 14, payout: 12 },
  { key: "barn", name: "Barn", weight: 8, payout: 25 },
  { key: "star", name: "Harvest Star", weight: 4, payout: 60 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

export function randomSymbol() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    if (r < sym.weight) return sym.key;
    r -= sym.weight;
  }
  return SYMBOLS[0].key;
}

// Each reel resolves to [top, mid, bottom]; only the middle row is the payline.
export function spinReels() {
  return [0, 1, 2].map(() => [randomSymbol(), randomSymbol(), randomSymbol()]);
}

export function evaluate(result, bet) {
  const mids = result.map((reel) => reel[1]);
  if (mids[0] === mids[1] && mids[1] === mids[2]) {
    const symbol = SYMBOLS.find((s) => s.key === mids[0]);
    return { win: bet * symbol.payout, symbol };
  }
  if (mids[0] === mids[1] || mids[1] === mids[2] || mids[0] === mids[2]) {
    return { win: Math.round(bet * 0.4), symbol: null };
  }
  return { win: 0, symbol: null };
}

export const BET = 5;
export const START_CREDITS = 100;
export const PAIR_MULTIPLIER = 0.4;

// The real math behind the machine — same probability model a slot's math
// sheet would document, computed live from SYMBOLS/BET rather than
// hand-typed, so it can never drift out of sync with actual play.
export function symbolProbability(symbol) {
  return symbol.weight / TOTAL_WEIGHT;
}

// Each payline position is an independent draw, so three-in-a-row on one
// symbol is that symbol's single-position probability cubed.
export function threeKindProbability(symbol) {
  return symbolProbability(symbol) ** 3;
}

// P(exactly two of three positions share a symbol) summed across every
// symbol that could be the pair — the binomial "exactly 2 of 3 successes"
// term, C(3,2)·p²·(1-p), added up over all six symbols.
export function pairProbability() {
  return SYMBOLS.reduce((sum, s) => {
    const p = symbolProbability(s);
    return sum + 3 * p * p * (1 - p);
  }, 0);
}

export function computeMath(bet = BET) {
  const rows = SYMBOLS.map((symbol) => {
    const probability = symbolProbability(symbol);
    const hitChance = threeKindProbability(symbol);
    return {
      symbol,
      probability,
      hitChance,
      oneInN: 1 / hitChance,
      evContribution: hitChance * symbol.payout,
    };
  });
  const threeKindEV = rows.reduce((sum, r) => sum + r.evContribution, 0);
  const pairP = pairProbability();
  const pairEV = pairP * (Math.round(bet * PAIR_MULTIPLIER) / bet);
  const rtp = threeKindEV + pairEV;
  const hitFrequency = rows.reduce((sum, r) => sum + r.hitChance, 0) + pairP;
  return { rows, threeKindEV, pairP, pairEV, rtp, hitFrequency };
}
