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
