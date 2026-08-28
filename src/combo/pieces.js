// Seven pieces, each a fast-food item instead of a plain color, each with
// 4 rotation states as [row, col] offsets in a 4x4 box. Simple rotation
// (cycle to the next state, nudge left/right/up if it collides, cancel if
// nothing fits) rather than full SRS wall-kick tables — plenty for a fun
// homage, and piecesSmokeTest.mjs checks every state is actually a valid,
// connected 4-cell shape before any rendering code trusts this data.
export const PIECES = {
  I: {
    food: "fries",
    color: "#e0b23c",
    rotations: [
      [[1, 0], [1, 1], [1, 2], [1, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
    ],
  },
  O: {
    food: "donut",
    color: "#d97e3a",
    rotations: [
      [[0, 1], [0, 2], [1, 1], [1, 2]],
      [[0, 1], [0, 2], [1, 1], [1, 2]],
      [[0, 1], [0, 2], [1, 1], [1, 2]],
      [[0, 1], [0, 2], [1, 1], [1, 2]],
    ],
  },
  T: {
    food: "taco",
    color: "#c9781f",
    rotations: [
      [[0, 1], [1, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 1]],
      [[0, 1], [1, 0], [1, 1], [2, 1]],
    ],
  },
  S: {
    food: "pizza",
    color: "#4a7c3f",
    rotations: [
      [[0, 1], [0, 2], [1, 0], [1, 1]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [0, 2], [1, 0], [1, 1]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
    ],
  },
  Z: {
    food: "hotdog",
    color: "#c0392b",
    rotations: [
      [[0, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 2], [1, 1], [1, 2], [2, 1]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 2], [1, 1], [1, 2], [2, 1]],
    ],
  },
  J: {
    food: "cup",
    color: "#5a7fc2",
    rotations: [
      [[0, 0], [1, 0], [1, 1], [1, 2]],
      [[0, 1], [0, 2], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 0], [2, 1]],
    ],
  },
  L: {
    food: "burger",
    color: "#8a6a4a",
    rotations: [
      [[0, 2], [1, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [1, 2], [2, 0]],
      [[0, 0], [0, 1], [1, 1], [2, 1]],
    ],
  },
};

export const PIECE_KEYS = Object.keys(PIECES);

export function cellsFor(key, rotationIndex) {
  return PIECES[key].rotations[((rotationIndex % 4) + 4) % 4];
}
