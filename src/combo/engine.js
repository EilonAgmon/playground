import { PIECES, PIECE_KEYS, cellsFor } from "./pieces.js";
import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// A Tetris-shaped homage (original content): same falling-piece/line-clear
// core as the genre, food-skinned blocks instead of plain colors, a 7-bag
// randomizer (each of the 7 pieces exactly once per bag, reshuffled when
// empty) instead of pure random so droughts can't happen, and simple
// same-frame lock (no lock-delay grace window) — a deliberate scope cut,
// not a bug: it keeps collision/locking logic small and easy to verify.
export function createComboEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const COLS = 10;
  const ROWS = 20;
  const CELL = 26;
  const WELL_W = COLS * CELL;
  const WELL_H = ROWS * CELL;
  const SIDEBAR_W = 112;
  const LOGICAL_W = WELL_W + SIDEBAR_W;
  const LOGICAL_H = WELL_H;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const BASE_FALL_MS = 800;
  const MIN_FALL_MS = 120;
  const SOFT_DROP_MS = 45;
  const LINES_PER_LEVEL = 10;
  const LINE_SCORE = [0, 100, 300, 500, 800];

  const particles = createParticleSystem();
  const shake = createScreenShake();

  let scale = 1;
  let phase = "title";
  let score = 0;
  let level = 1;
  let linesCleared = 0;

  let board, active, bag, nextQueue, fallTimer, softDropping;

  function freshBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function drawFromBag() {
    if (bag.length === 0) bag = shuffle(PIECE_KEYS);
    return bag.shift();
  }

  function spawnPiece(key) {
    const cells = cellsFor(key, 0);
    const maxCol = Math.max(...cells.map((c) => c[1]));
    const col = Math.floor((COLS - (maxCol + 1)) / 2);
    return { key, rotation: 0, row: 0, col };
  }

  function canPlace(key, rotation, row, col) {
    for (const [dr, dc] of cellsFor(key, rotation)) {
      const r = row + dr;
      const c = col + dc;
      if (c < 0 || c >= COLS || r >= ROWS) return false;
      if (r >= 0 && board[r][c]) return false;
    }
    return true;
  }

  function fallIntervalMs() {
    return Math.max(MIN_FALL_MS, BASE_FALL_MS - (level - 1) * 60);
  }

  function freshWorld() {
    board = freshBoard();
    bag = shuffle(PIECE_KEYS);
    nextQueue = [drawFromBag(), drawFromBag()];
    active = spawnPiece(nextQueue.shift());
    nextQueue.push(drawFromBag());
    fallTimer = fallIntervalMs();
    softDropping = false;
    score = 0;
    level = 1;
    linesCleared = 0;
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

  // ---------- input ----------

  function tryMove(dc) {
    if (phase !== "playing") return;
    if (canPlace(active.key, active.rotation, active.row, active.col + dc)) {
      active.col += dc;
    }
  }

  function tryRotate() {
    if (phase !== "playing") return;
    const next = active.rotation + 1;
    for (const kick of [0, 1, -1, 2, -2]) {
      if (canPlace(active.key, next, active.row, active.col + kick)) {
        active.rotation = next;
        active.col += kick;
        beep(520, 0.05, "square", 0.05);
        return;
      }
    }
  }

  function hardDrop() {
    if (phase !== "playing") return;
    let dist = 0;
    while (canPlace(active.key, active.rotation, active.row + 1, active.col)) {
      active.row += 1;
      dist += 1;
    }
    if (dist > 0) score += dist * 2;
    lockActive();
  }

  function setSoftDrop(on) {
    softDropping = on;
  }

  function onKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") tryMove(-1);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") tryMove(1);
    else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") tryRotate();
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") setSoftDrop(true);
    else if (e.key === " ") {
      e.preventDefault();
      if (phase === "title" || phase === "gameover") startOrRestart();
      else hardDrop();
    }
  }
  function onKeyUp(e) {
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") setSoftDrop(false);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function onCanvasPointerDown() {
    if (phase === "title" || phase === "gameover") startOrRestart();
  }
  canvas.addEventListener("pointerdown", onCanvasPointerDown);

  function startOrRestart() {
    ensureAudio();
    freshWorld();
    setState("playing", hudSnapshot());
  }

  function hudSnapshot() {
    return { score, level, lines: linesCleared, next: nextQueue[0] };
  }

  // ---------- locking + line clear ----------

  function lockActive() {
    for (const [dr, dc] of cellsFor(active.key, active.rotation)) {
      const r = active.row + dr;
      const c = active.col + dc;
      if (r < 0) {
        setState("gameover", { score, level, lines: linesCleared });
        return;
      }
      board[r][c] = active.key;
    }
    beep(220, 0.08, "square", 0.08);

    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every((cell) => cell !== null)) fullRows.push(r);
    }
    if (fullRows.length > 0) {
      // Splicing rows out one at a time while iterating ascending indices
      // shifts everything below each removal up by one, so a later index
      // in the same pass no longer points at the row it was collected
      // from — filtering instead sidesteps that class of bug entirely.
      const fullSet = new Set(fullRows);
      board = board.filter((_, r) => !fullSet.has(r));
      for (let i = 0; i < fullRows.length; i++) board.unshift(Array(COLS).fill(null));
      linesCleared += fullRows.length;
      score += LINE_SCORE[fullRows.length] * level;
      level = Math.floor(linesCleared / LINES_PER_LEVEL) + 1;
      shake.trigger(3 + fullRows.length, 0.25);
      for (const r of fullRows) {
        particles.burst((WELL_W / 2), r * CELL, { color: "#ffe9a8", count: 10, speed: 90, life: 0.35, size: 2 });
      }
      beep(fullRows.length >= 4 ? 880 : 660, 0.25, "triangle", 0.14);
    }

    const nextKey = nextQueue.shift();
    nextQueue.push(drawFromBag());
    active = spawnPiece(nextKey);
    fallTimer = fallIntervalMs();

    if (!canPlace(active.key, active.rotation, active.row, active.col)) {
      setState("gameover", { score, level, lines: linesCleared });
    }
  }

  // ---------- update ----------

  function update(dt) {
    particles.update(dt);
    shake.update(dt);
    if (phase !== "playing") return;

    const interval = softDropping ? SOFT_DROP_MS : fallIntervalMs();
    fallTimer -= dt * 1000;
    if (fallTimer <= 0) {
      fallTimer += interval;
      if (canPlace(active.key, active.rotation, active.row + 1, active.col)) {
        active.row += 1;
        if (softDropping) score += 1;
      } else {
        lockActive();
      }
    }

    onState("playing", hudSnapshot());
  }

  // ---------- render ----------

  const FOOD_COLORS = {
    fries: "#e0b23c",
    donut: "#d97e3a",
    taco: "#c9781f",
    pizza: "#4a7c3f",
    hotdog: "#c0392b",
    cup: "#5a7fc2",
    burger: "#8a6a4a",
  };

  function drawFoodGlyph(food, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    const s = size;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    if (food === "burger") {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.roundRect(-s * 0.35, i * s * 0.22 - s * 0.05, s * 0.7, s * 0.16, s * 0.08);
        ctx.fill();
      }
    } else if (food === "fries") {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.rect(i * s * 0.18 - s * 0.05, -s * 0.32, s * 0.1, s * 0.64);
        ctx.fill();
      }
    } else if (food === "pizza") {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.35);
      ctx.lineTo(s * 0.32, s * 0.3);
      ctx.lineTo(-s * 0.32, s * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (food === "donut") {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    } else if (food === "taco") {
      ctx.beginPath();
      ctx.arc(0, s * 0.08, s * 0.34, Math.PI, 0);
      ctx.fill();
    } else if (food === "hotdog") {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.34, s * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.24, 0);
      ctx.lineTo(s * 0.24, 0);
      ctx.stroke();
    } else if (food === "cup") {
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, -s * 0.3);
      ctx.lineTo(s * 0.22, -s * 0.3);
      ctx.lineTo(s * 0.14, s * 0.32);
      ctx.lineTo(-s * 0.14, s * 0.32);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCell(row, col, key, alpha = 1) {
    const x = col * CELL;
    const y = row * CELL;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PIECES[key].color;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    drawFoodGlyph(PIECES[key].food, x + CELL / 2, y + CELL / 2, CELL * 0.85);
    ctx.globalAlpha = 1;
  }

  function drawWell() {
    ctx.fillStyle = "#0b0e18";
    ctx.fillRect(0, 0, WELL_W, WELL_H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, WELL_H);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(WELL_W, r * CELL);
      ctx.stroke();
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) drawCell(r, c, board[r][c]);
      }
    }
  }

  function drawGhost() {
    let ghostRow = active.row;
    while (canPlace(active.key, active.rotation, ghostRow + 1, active.col)) ghostRow++;
    ctx.globalAlpha = 0.22;
    for (const [dr, dc] of cellsFor(active.key, active.rotation)) {
      const r = ghostRow + dr;
      const c = active.col + dc;
      if (r >= 0) drawCell(r, c, active.key);
    }
    ctx.globalAlpha = 1;
  }

  function drawActive() {
    for (const [dr, dc] of cellsFor(active.key, active.rotation)) {
      const r = active.row + dr;
      const c = active.col + dc;
      if (r >= 0) drawCell(r, c, active.key);
    }
  }

  function drawSidebar() {
    const x0 = WELL_W;
    ctx.fillStyle = "#05070f";
    ctx.fillRect(x0, 0, SIDEBAR_W, LOGICAL_H);

    ctx.fillStyle = "rgba(230, 245, 250, 0.55)";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", x0 + 14, 24);

    const nextKey = nextQueue[0];
    const nextCells = cellsFor(nextKey, 0);
    const previewCell = 18;
    const ox = x0 + SIDEBAR_W / 2 - 1.5 * previewCell;
    const oy = 42;
    for (const [dr, dc] of nextCells) {
      const x = ox + dc * previewCell;
      const y = oy + dr * previewCell;
      ctx.fillStyle = PIECES[nextKey].color;
      ctx.fillRect(x + 1, y + 1, previewCell - 2, previewCell - 2);
      drawFoodGlyph(PIECES[nextKey].food, x + previewCell / 2, y + previewCell / 2, previewCell * 0.85);
    }

    ctx.fillStyle = "rgba(230, 245, 250, 0.92)";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("SCORE", x0 + 14, 140);
    ctx.fillText(`${score}`, x0 + 14, 158);
    ctx.fillText("LEVEL", x0 + 14, 190);
    ctx.fillText(`${level}`, x0 + 14, 208);
    ctx.fillText("LINES", x0 + 14, 240);
    ctx.fillText(`${linesCleared}`, x0 + 14, 258);
  }

  function render() {
    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);
    drawWell();
    if (phase === "playing") {
      drawGhost();
      drawActive();
    }
    particles.draw(ctx);
    ctx.restore();
    drawSidebar();
  }

  let lastTime = performance.now();
  let rafId = null;
  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 1 / 30);

    update(dt);
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
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("pointerdown", onCanvasPointerDown);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart, destroy, tryMove, tryRotate, hardDrop, setSoftDrop };
}
