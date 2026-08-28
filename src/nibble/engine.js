import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";
import { buildMaze, COLS, ROWS, WALL, DOT, POWER, EMPTY, PLAYER_START, GHOST_HOUSE, GHOST_EXIT, isWall } from "./maze.js";

// A Pac-Man-shaped homage (original content): grid-snapped movement with
// pixel-smooth interpolation between cells (the standard technique —
// snap to cell-center to re-evaluate direction, move continuously
// in between), four ghosts with distinct targeting behaviors instead of
// one shared "chase" rule, and a level counter instead of a single board.
export function createNibbleEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const CELL = 24;
  const LOGICAL_W = COLS * CELL;
  const LOGICAL_H = ROWS * CELL;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const PLAYER_SPEED = 130;
  const GHOST_SPEED_BASE = 108;
  const FRIGHTENED_SPEED = 76;
  const FRIGHTENED_TIME = 7;
  const RELEASE_INTERVAL = 3.2;
  const START_LIVES = 3;
  const PLAYER_RADIUS = CELL * 0.42;
  const GHOST_RADIUS = CELL * 0.42;
  const INVULN_TIME = 1.6;

  const DIRS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };
  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

  const GHOST_DEFS = [
    { key: "chaser", color: "#ff5c5c", corner: { row: 1, col: COLS - 2 } },
    { key: "ambusher", color: "#ff9ed8", corner: { row: 1, col: 1 } },
    { key: "patroller", color: "#7de6ff", corner: { row: ROWS - 2, col: COLS - 2 } },
    { key: "flee", color: "#ffb95c", corner: { row: ROWS - 2, col: 1 } },
  ];

  const particles = createParticleSystem();
  const shake = createScreenShake();

  let scale = 1;
  let phase = "title";
  let lives = START_LIVES;
  let score = 0;
  let level = 1;
  let dotsRemaining = 0;

  let maze, player, ghosts, releaseTimer, frightTimer, ghostEatStreak;

  function cellCenter(row, col) {
    return { x: (col + 0.5) * CELL, y: (row + 0.5) * CELL };
  }
  function cellOf(x, y) {
    return { row: Math.floor(y / CELL), col: Math.floor((((x % LOGICAL_W) + LOGICAL_W) % LOGICAL_W) / CELL) };
  }
  function nearlyAt(a, b, eps = 3) {
    return Math.abs(a - b) < eps;
  }
  function canStep(row, col, dir) {
    return !isWall(maze, row + dir.dy, col + dir.dx);
  }

  function countDots() {
    let n = 0;
    for (const row of maze) for (const ch of row) if (ch === DOT || ch === POWER) n++;
    return n;
  }

  function freshMaze() {
    maze = buildMaze();
    dotsRemaining = countDots();
  }

  function freshActors() {
    const start = cellCenter(PLAYER_START.row, PLAYER_START.col);
    player = { x: start.x, y: start.y, dir: DIRS.left, nextDir: DIRS.left, mouthPhase: 0, invuln: INVULN_TIME };

    const home = cellCenter(GHOST_HOUSE.row, GHOST_HOUSE.col);
    ghosts = GHOST_DEFS.map((def, i) => ({
      ...def,
      x: home.x + (i - 1.5) * (CELL * 0.4),
      y: home.y,
      dir: DIRS.up,
      state: "house",
      released: false,
    }));
    releaseTimer = RELEASE_INTERVAL;
    frightTimer = 0;
    ghostEatStreak = 0;
  }

  function freshWorld() {
    freshMaze();
    freshActors();
    particles.clear();
  }
  freshWorld();

  function setState(next, extra) {
    phase = next;
    onState(next, extra);
  }

  function resize() {
    let cssW = window.innerWidth;
    let cssH = window.innerHeight;
    if (cssW / cssH > ASPECT) cssW = cssH * ASPECT;
    else cssH = cssW / ASPECT;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    scale = canvas.width / LOGICAL_W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);

  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } else if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }
  function beep(freq, duration, type = "square", vol = 0.12) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function dist2(ax, ay, bx, by) {
    return (ax - bx) ** 2 + (ay - by) ** 2;
  }

  // ---------- input ----------

  function setDir(name) {
    player.nextDir = DIRS[name];
  }

  function onKeyDown(e) {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") setDir("up");
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") setDir("down");
    else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setDir("left");
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setDir("right");
    else if (e.key === " ") {
      if (phase === "title" || phase === "gameover") startOrRestart();
    }
  }
  window.addEventListener("keydown", onKeyDown);

  function onCanvasPointerDown() {
    if (phase === "title" || phase === "gameover") startOrRestart();
  }
  canvas.addEventListener("pointerdown", onCanvasPointerDown);

  function startOrRestart() {
    ensureAudio();
    lives = START_LIVES;
    score = 0;
    level = 1;
    freshWorld();
    setState("playing", hudSnapshot());
  }

  function hudSnapshot() {
    return { lives, score, level };
  }

  // ---------- player ----------

  function updatePlayer(dt) {
    if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);
    const { row, col } = cellOf(player.x, player.y);
    const center = cellCenter(row, col);
    if (nearlyAt(player.x, center.x) && nearlyAt(player.y, center.y)) {
      player.x = center.x;
      player.y = center.y;
      if (canStep(row, col, player.nextDir)) player.dir = player.nextDir;
      if (!canStep(row, col, player.dir)) player.dir = { dx: 0, dy: 0 };

      const cell = maze[row][col];
      if (cell === DOT || cell === POWER) {
        maze[row] = maze[row].slice(0, col) + EMPTY + maze[row].slice(col + 1);
        dotsRemaining -= 1;
        score += cell === POWER ? 50 : 10;
        beep(cell === POWER ? 220 : 440, 0.05, "square", 0.05);
        if (cell === POWER) {
          frightTimer = FRIGHTENED_TIME;
          ghostEatStreak = 0;
        }
      }
    }
    player.x += player.dir.dx * PLAYER_SPEED * dt;
    player.y += player.dir.dy * PLAYER_SPEED * dt;
    if (player.x < -CELL / 2) player.x = LOGICAL_W + CELL / 2;
    if (player.x > LOGICAL_W + CELL / 2) player.x = -CELL / 2;

    player.mouthPhase += dt * 9;
  }

  // ---------- ghosts ----------

  // Derived live from frightTimer rather than a per-ghost flag set only at
  // the moment a pellet is eaten — a ghost still waiting in the house at
  // that instant would otherwise emerge in normal chase mode even though
  // the fright window is technically still open when it's released.
  function isFrightened(g) {
    return frightTimer > 0 && g.state === "roaming";
  }

  function ghostTarget(g) {
    if (isFrightened(g)) return null; // handled separately: random choice
    if (g.state === "eaten") return GHOST_HOUSE;
    if (g.state === "house" || g.state === "leaving") return GHOST_EXIT;
    switch (g.key) {
      case "chaser":
        return cellOf(player.x, player.y);
      case "ambusher": {
        const pc = cellOf(player.x, player.y);
        return { row: pc.row + player.dir.dy * 4, col: pc.col + player.dir.dx * 4 };
      }
      case "patroller": {
        const pc = cellOf(player.x, player.y);
        const dRow = pc.row - g.corner.row;
        const dCol = pc.col - g.corner.col;
        return { row: g.corner.row + dRow * 0.5, col: g.corner.col + dCol * 0.5 };
      }
      case "flee": {
        const pc = cellOf(player.x, player.y);
        const d = dist2(g.x, g.y, player.x, player.y);
        return d < (CELL * 6) ** 2 ? g.corner : pc;
      }
      default:
        return g.corner;
    }
  }

  function chooseGhostDir(g, row, col) {
    const options = Object.entries(DIRS).filter(([name, d]) => {
      if (OPPOSITE[dirName(g.dir)] === name) return false; // no 180s
      return canStep(row, col, d);
    });
    if (options.length === 0) return g.dir;
    if (isFrightened(g)) return options[Math.floor(Math.random() * options.length)][1];

    const target = ghostTarget(g);
    let best = options[0][1];
    let bestDist = Infinity;
    for (const [, d] of options) {
      const nr = row + d.dy;
      const nc = col + d.dx;
      const dd = (nr - target.row) ** 2 + (nc - target.col) ** 2;
      if (dd < bestDist) {
        bestDist = dd;
        best = d;
      }
    }
    return best;
  }

  function dirName(d) {
    if (d.dx === 1) return "right";
    if (d.dx === -1) return "left";
    if (d.dy === 1) return "down";
    return "up";
  }

  function updateGhost(g, dt, speed) {
    const { row, col } = cellOf(g.x, g.y);
    const center = cellCenter(row, col);
    const atCenter = nearlyAt(g.x, center.x) && nearlyAt(g.y, center.y);

    if (g.state === "house") {
      g.y += Math.sin(performance.now() / 220 + g.corner.col) * 6 * dt;
      return;
    }

    if (atCenter) {
      g.x = center.x;
      g.y = center.y;

      if (g.state === "leaving" && row === GHOST_EXIT.row && col === GHOST_EXIT.col) {
        g.state = "roaming";
      }
      if (g.state === "eaten" && row === GHOST_HOUSE.row && col === GHOST_HOUSE.col) {
        g.state = "leaving";
      }
      g.dir = chooseGhostDir(g, row, col);
    }

    g.x += g.dir.dx * speed * dt;
    g.y += g.dir.dy * speed * dt;
    if (g.x < -CELL / 2) g.x = LOGICAL_W + CELL / 2;
    if (g.x > LOGICAL_W + CELL / 2) g.x = -CELL / 2;
  }

  function updateGhosts(dt) {
    if (frightTimer > 0) frightTimer = Math.max(0, frightTimer - dt);

    const waiting = ghosts.filter((g) => g.state === "house");
    if (waiting.length > 0) {
      releaseTimer -= dt;
      if (releaseTimer <= 0) {
        // Ghosts spawn with a small x-offset so they don't all overlap
        // while waiting (purely visual) — but that offset is never exactly
        // a cell-center, so if they kept it while leaving, atCenter would
        // never go true, chooseGhostDir would never get called, and
        // they'd just drift in whatever direction they last had forever.
        // Snap to the house's true center before starting the exit walk.
        const home = cellCenter(GHOST_HOUSE.row, GHOST_HOUSE.col);
        waiting[0].x = home.x;
        waiting[0].y = home.y;
        waiting[0].dir = DIRS.up;
        waiting[0].state = "leaving";
        releaseTimer = RELEASE_INTERVAL;
      }
    }

    for (const g of ghosts) {
      const speed = isFrightened(g) ? FRIGHTENED_SPEED : GHOST_SPEED_BASE + (level - 1) * 6;
      updateGhost(g, dt, g.state === "eaten" ? GHOST_SPEED_BASE * 1.6 : speed);
    }
  }

  // ---------- collisions ----------

  function handleGhostContact() {
    for (const g of ghosts) {
      if (g.state !== "roaming") continue;
      if (dist2(player.x, player.y, g.x, g.y) > (PLAYER_RADIUS + GHOST_RADIUS) ** 2) continue;

      if (isFrightened(g)) {
        g.state = "eaten";
        ghostEatStreak += 1;
        const bonus = 200 * 2 ** Math.min(ghostEatStreak - 1, 3);
        score += bonus;
        shake.trigger(4, 0.2);
        particles.burst(g.x, g.y, { color: g.color, count: 14, speed: 130, life: 0.4 });
        beep(880, 0.15, "triangle", 0.12);
      } else if (player.invuln <= 0) {
        hurtPlayer();
        return;
      }
    }
  }

  function hurtPlayer() {
    shake.trigger(9, 0.3);
    particles.burst(player.x, player.y, { color: "#ffe066", count: 18, speed: 150, life: 0.45 });
    beep(140, 0.25, "sawtooth", 0.16);
    lives -= 1;
    if (lives <= 0) {
      setState("gameover", { lives: 0, score, level });
      return;
    }
    freshActors();
    onState("playing", hudSnapshot());
  }

  // ---------- update ----------

  function update(dt) {
    if (phase !== "playing") return;
    updatePlayer(dt);
    if (phase !== "playing") return;
    updateGhosts(dt);
    handleGhostContact();
    if (phase !== "playing") return;

    if (dotsRemaining <= 0) {
      level += 1;
      shake.trigger(5, 0.3);
      beep(660, 0.35, "triangle", 0.14);
      freshMaze();
      freshActors();
    }

    onState("playing", hudSnapshot());
  }

  // ---------- render ----------

  function drawMaze() {
    ctx.fillStyle = "#05070f";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.strokeStyle = "#2a3a6b";
    ctx.lineWidth = 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (maze[r][c] !== WALL) continue;
        ctx.strokeRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  }

  function drawDots() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = maze[r][c];
        if (ch !== DOT && ch !== POWER) continue;
        const { x, y } = cellCenter(r, c);
        if (ch === POWER) {
          const pulse = 1 + Math.sin(performance.now() / 160) * 0.15;
          ctx.fillStyle = "#ffe9a8";
          ctx.beginPath();
          ctx.arc(x, y, CELL * 0.22 * pulse, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#7a8ad6";
          ctx.beginPath();
          ctx.arc(x, y, CELL * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawPlayer() {
    if (player.invuln > 0 && Math.floor(player.invuln * 14) % 2 === 0) return;
    const angle = Math.atan2(player.dir.dy, player.dir.dx) || 0;
    const mouth = Math.abs(Math.sin(player.mouthPhase)) * 0.28 + 0.04;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(angle);
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS, mouth * Math.PI, (2 - mouth) * Math.PI);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGhost(g) {
    const frightened = isFrightened(g);
    const frightenedSoon = frightened && frightTimer < 2 && Math.floor(frightTimer * 8) % 2 === 0;
    const color = g.state === "eaten" ? "rgba(220,230,255,0.5)" : frightened ? (frightenedSoon ? "#ffffff" : "#4a5cff") : g.color;
    ctx.fillStyle = color;
    ctx.beginPath();
    const r = GHOST_RADIUS;
    ctx.arc(g.x, g.y - r * 0.1, r, Math.PI, 0);
    ctx.lineTo(g.x + r, g.y + r * 0.7);
    for (let i = 0; i < 3; i++) {
      const cx = g.x + r - (i + 0.5) * ((2 * r) / 3);
      ctx.lineTo(cx, g.y + (i % 2 === 0 ? r * 0.35 : r * 0.7));
    }
    ctx.lineTo(g.x - r, g.y + r * 0.7);
    ctx.closePath();
    ctx.fill();

    const eyeDX = g.dir.dx * r * 0.18;
    const eyeDY = g.dir.dy * r * 0.18;
    ctx.fillStyle = frightened && !frightenedSoon ? "#c9d4ff" : "#eef3ff";
    ctx.beginPath();
    ctx.arc(g.x - r * 0.32 + eyeDX, g.y - r * 0.12 + eyeDY, r * 0.24, 0, Math.PI * 2);
    ctx.arc(g.x + r * 0.32 + eyeDX, g.y - r * 0.12 + eyeDY, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    if (!frightened) {
      ctx.fillStyle = "#0a0e1f";
      ctx.beginPath();
      ctx.arc(g.x - r * 0.32 + eyeDX * 1.6, g.y - r * 0.12 + eyeDY * 1.6, r * 0.11, 0, Math.PI * 2);
      ctx.arc(g.x + r * 0.32 + eyeDX * 1.6, g.y - r * 0.12 + eyeDY * 1.6, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud() {
    ctx.fillStyle = "rgba(230, 245, 250, 0.92)";
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`x${Math.max(0, lives)}`, LOGICAL_W - 12, 22);
    ctx.fillText(`SCORE ${score}`, LOGICAL_W - 12, 40);
    ctx.fillText(`LEVEL ${level}`, LOGICAL_W - 12, 58);
  }

  function render() {
    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);
    drawMaze();
    drawDots();
    for (const g of ghosts) drawGhost(g);
    drawPlayer();
    particles.draw(ctx);
    ctx.restore();
    drawHud();
  }

  let lastTime = performance.now();
  let rafId = null;
  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 1 / 30);

    update(dt);
    particles.update(dt);
    shake.update(dt);
    render();
    rafId = requestAnimationFrame(frame);
  }

  function onVisibilityChange() {
    if (!document.hidden) lastTime = performance.now();
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  rafId = requestAnimationFrame(frame);

  function destroy() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("orientationchange", resize);
    window.removeEventListener("keydown", onKeyDown);
    canvas.removeEventListener("pointerdown", onCanvasPointerDown);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart, destroy, setDir };
}
