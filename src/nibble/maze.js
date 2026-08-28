// The maze is built, not hand-typed as ASCII art: a border with a tunnel
// gap, a handful of small wall "pillars" placed in one quadrant and then
// mirrored into the other three (guarantees the classic symmetric look
// for free), and a ghost house carved into the center. Because pillars
// are small, isolated, and never placed adjacent to the border, the open
// space around them can't be partitioned into unreachable pockets by
// construction — and buildMazeSmokeTest.mjs flood-fills it to prove that
// rather than just asserting it.

export const COLS = 19;
export const ROWS = 21;
export const CENTER_COL = Math.floor(COLS / 2); // 9
export const CENTER_ROW = Math.floor(ROWS / 2); // 10

export const WALL = "#";
export const DOT = ".";
export const POWER = "o";
export const EMPTY = " ";

function mirrorCol(c) {
  return COLS - 1 - c;
}
function mirrorRow(r) {
  return ROWS - 1 - r;
}

// [rowStart, rowEnd, colStart, colEnd] inclusive, drawn in the top-left
// quadrant only — mirrored below into the other three.
const QUADRANT_PILLARS = [
  [2, 3, 2, 3],
  [2, 3, 6, 7],
  [5, 6, 1, 2],
  [5, 6, 4, 5],
  [8, 9, 2, 3],
  [8, 9, 6, 7],
];

function setRect(grid, r1, r2, c1, c2, ch) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) grid[r][c] = ch;
  }
}

export function buildMaze() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(DOT));

  // Border, with a horizontal tunnel gap on the center row.
  for (let c = 0; c < COLS; c++) {
    grid[0][c] = WALL;
    grid[ROWS - 1][c] = WALL;
  }
  for (let r = 0; r < ROWS; r++) {
    if (r === CENTER_ROW) continue; // tunnel row stays open at both edges
    grid[r][0] = WALL;
    grid[r][COLS - 1] = WALL;
  }

  for (const [r1, r2, c1, c2] of QUADRANT_PILLARS) {
    setRect(grid, r1, r2, c1, c2, WALL);
    setRect(grid, r1, r2, mirrorCol(c2), mirrorCol(c1), WALL);
    setRect(grid, mirrorRow(r2), mirrorRow(r1), c1, c2, WALL);
    setRect(grid, mirrorRow(r2), mirrorRow(r1), mirrorCol(c2), mirrorCol(c1), WALL);
  }

  // Ghost house: a small walled box centered on the grid, open only at
  // the top-center gap (the exit) and hollow inside (where ghosts wait).
  const gr = CENTER_ROW; // 10
  const gc = CENTER_COL; // 9
  setRect(grid, gr - 1, gr - 1, gc - 2, gc + 2, WALL);
  grid[gr - 1][gc] = EMPTY; // exit gap
  grid[gr][gc - 2] = WALL;
  grid[gr][gc + 2] = WALL;
  setRect(grid, gr + 1, gr + 1, gc - 2, gc + 2, WALL);
  setRect(grid, gr, gr, gc - 1, gc + 1, EMPTY); // interior, no dots

  // Tunnel row: no dots in the open stretch right at the mouth, keeps the
  // wrap feeling clean rather than pellet-lined right up to the edge.
  grid[CENTER_ROW][1] = EMPTY;
  grid[CENTER_ROW][COLS - 2] = EMPTY;

  // Power pellets near the four corners — pulled down from row 1 to row 4
  // on the top edge (still clear of every pillar) so they don't sit under
  // the canvas HUD text, which lives top-right for the same reason
  // Shatter's does: nothing above row 4 in that corner.
  grid[4][1] = POWER;
  grid[4][COLS - 2] = POWER;
  grid[ROWS - 2][1] = POWER;
  grid[ROWS - 2][COLS - 2] = POWER;

  return grid.map((row) => row.join(""));
}

export const PLAYER_START = { row: 15, col: CENTER_COL };
export const GHOST_HOUSE = { row: CENTER_ROW, col: CENTER_COL };
export const GHOST_EXIT = { row: CENTER_ROW - 1, col: CENTER_COL };

export function isWall(maze, row, col) {
  const wrappedCol = ((col % COLS) + COLS) % COLS;
  if (row < 0 || row >= ROWS) return true;
  return maze[row][wrappedCol] === WALL;
}
