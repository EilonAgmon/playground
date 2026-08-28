// A standard double-six domino set (28 unique tiles, values 0-6 on each
// half) with travel icons standing in for pip-dot counts. VALUES maps
// each number to an icon key + label purely for rendering; the actual
// game logic only ever deals in the numbers 0-6.
export const VALUES = [
  { n: 0, icon: "globe", label: "Globe" },
  { n: 1, icon: "compass", label: "Compass" },
  { n: 2, icon: "plane", label: "Plane" },
  { n: 3, icon: "suitcase", label: "Suitcase" },
  { n: 4, icon: "tent", label: "Tent" },
  { n: 5, icon: "mountain", label: "Mountain" },
  { n: 6, icon: "pin", label: "Pin" },
];

export function iconFor(n) {
  return VALUES[n].icon;
}

export function fullSet() {
  const tiles = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      tiles.push({ a, b, id: `${a}-${b}` });
    }
  }
  return tiles;
}
