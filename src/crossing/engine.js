import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// A from-scratch road-then-river crossing homage (Frogger-shaped, original
// content). Same architecture as the other canvas games (logical coordinate
// space + DPR scaling, RAF loop, onState callback), but the player's own
// movement is discrete (one grid hop per input) layered on top of
// continuously-moving hazards, rather than continuous movement throughout.
export function createCrossingEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const CELL = 48;
  const COLS = 9;
  const ROWS = 11;
  const LOGICAL_W = COLS * CELL;
  const LOGICAL_H = ROWS * CELL;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const START_ROW = 0;
  const MEDIAN_ROW = 5;
  const HOME_ROW = 10;
  const ROAD_ROWS = new Set([1, 2, 3, 4]);
  const RIVER_ROWS = new Set([6, 7, 8, 9]);
  const HOME_SLOT_COLS = [1, 4, 7];
  const HOME_SLOT_W = CELL * 0.9;

  const START_LIVES = 4;
  const LIFE_TIME = 25;
  const HOP_ANIM = 0.16;
  const FROG_SIZE = 32;

  // Lane hazard configs, keyed by row. Road lanes (kind: "car"/"truck") are
  // deadly on contact; river lanes (kind: "log") are the only safe footing
  // while in a river row — anything else there is water.
  const LANES = {
    1: { dir: 1, speed: 78, kind: "car", width: 38, count: 3, spacing: 168, color: "#c25b4a" },
    2: { dir: -1, speed: 102, kind: "truck", width: 64, count: 2, spacing: 236, color: "#8a6a2f" },
    3: { dir: 1, speed: 58, kind: "car", width: 38, count: 3, spacing: 150, color: "#5a7fc2" },
    4: { dir: -1, speed: 118, kind: "car", width: 38, count: 3, spacing: 180, color: "#c25b4a" },
    6: { dir: -1, speed: 55, kind: "log", width: 100, count: 2, spacing: 250, color: "#7a5230" },
    7: { dir: 1, speed: 40, kind: "log", width: 140, count: 2, spacing: 270, color: "#6b4a28" },
    8: { dir: -1, speed: 66, kind: "log", width: 88, count: 3, spacing: 200, color: "#7a5230" },
    9: { dir: 1, speed: 48, kind: "log", width: 120, count: 2, spacing: 260, color: "#6b4a28" },
  };

  const particles = createParticleSystem();
  const shake = createScreenShake();

  let scale = 1;
  let phase = "title";
  let lives = START_LIVES;
  let homesFilled = [];
  let lanePhase = {};
  let frog, lifeTimer, keys;

  function rowY(row) {
    return LOGICAL_H - (row + 0.5) * CELL;
  }
  function colX(col) {
    return (col + 0.5) * CELL;
  }

  function freshWorld() {
    homesFilled = HOME_SLOT_COLS.map(() => false);
    lanePhase = {};
    for (const row of Object.keys(LANES)) lanePhase[row] = Math.random() * 1000;
    resetFrog();
    particles.clear();
  }
  freshWorld();

  function resetFrog() {
    frog = { col: Math.floor(COLS / 2), row: START_ROW, x: colX(Math.floor(COLS / 2)), hopAnim: 0, invuln: 1 };
    lifeTimer = LIFE_TIME;
  }

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

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function aabbOverlap(a, b) {
    return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
  }

  function frogHitbox() {
    const y = rowY(frog.row);
    return { x1: frog.x - FROG_SIZE / 2, x2: frog.x + FROG_SIZE / 2, y1: y - FROG_SIZE / 2, y2: y + FROG_SIZE / 2 };
  }

  function laneObstacles(row) {
    const lane = LANES[row];
    if (!lane) return [];
    const period = COLS * CELL + lane.spacing;
    const y = rowY(row);
    const out = [];
    for (let i = 0; i < lane.count; i++) {
      let x = ((i * lane.spacing + lanePhase[row]) % period + period) % period;
      x -= lane.spacing / 2;
      out.push({ x, y, w: lane.width, kind: lane.kind, color: lane.color });
    }
    return out;
  }
  function obstacleHitbox(o) {
    return { x1: o.x - o.w / 2, x2: o.x + o.w / 2, y1: o.y - CELL * 0.36, y2: o.y + CELL * 0.36 };
  }

  // ---------- input ----------

  function tryHop(dir) {
    if (phase !== "playing" || frog.hopAnim > 0) return;
    // Recompute the frog's actual current column from its (possibly
    // log-drifted) x position rather than trusting frog.col: that field
    // only gets written by a hop, so after riding a log for a while it
    // goes stale, and hopping — especially straight up/down, which
    // shouldn't touch the column at all — would snap the frog sideways
    // back to wherever it was before it started drifting.
    let col = clamp(Math.round(frog.x / CELL - 0.5), 0, COLS - 1);
    let row = frog.row;
    if (dir === "up") row = Math.min(HOME_ROW, row + 1);
    else if (dir === "down") row = Math.max(START_ROW, row - 1);
    else if (dir === "left") col = col - 1;
    else if (dir === "right") col = col + 1;

    if (col < 0 || col > COLS - 1) return; // can't hop off the sides

    if (row === HOME_ROW && row !== frog.row) {
      const slotIdx = HOME_SLOT_COLS.indexOf(col);
      const validSlot = slotIdx !== -1 && !homesFilled[slotIdx];
      if (!validSlot) {
        killFrog();
        return;
      }
      homesFilled[slotIdx] = true;
      shake.trigger(3, 0.15);
      particles.burst(colX(col), rowY(row), { color: "#7dffb3", count: 20, speed: 160, life: 0.5 });
      beep(880, 0.15, "triangle", 0.14);
      ensureAudio();
      if (homesFilled.every(Boolean)) {
        setState("win", { lives });
        return;
      }
      resetFrog();
      onState("playing", hudSnapshot());
      return;
    }

    frog.col = col;
    frog.row = row;
    frog.x = colX(col);
    frog.hopAnim = HOP_ANIM;
    ensureAudio();
    beep(row > 0 && row === frog.row ? 500 : 420, 0.05, "square", 0.05);
    onState("playing", hudSnapshot());
  }

  const keyDir = {
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
  };
  function onKeyDown(e) {
    if (e.repeat) return;
    const dir = keyDir[e.key];
    if (dir) {
      e.preventDefault();
      if (phase === "title" || phase === "gameover" || phase === "win") startOrRestart();
      else tryHop(dir);
    }
  }
  window.addEventListener("keydown", onKeyDown);

  function onCanvasPointerDown() {
    if (phase === "title" || phase === "gameover" || phase === "win") startOrRestart();
  }
  canvas.addEventListener("pointerdown", onCanvasPointerDown);

  function startOrRestart() {
    ensureAudio();
    lives = START_LIVES;
    freshWorld();
    setState("playing", { lives, weapon: null });
  }

  function hudSnapshot() {
    return { lives, homesFilled: [...homesFilled], lifeTimer: Math.max(0, lifeTimer), lifeTimeMax: LIFE_TIME };
  }

  function killFrog() {
    if (frog.invuln > 0) return;
    shake.trigger(8, 0.3);
    particles.burst(frog.x, rowY(frog.row), { color: "#7dc4ff", count: 18, speed: 160, life: 0.45 });
    beep(140, 0.22, "sawtooth", 0.14);
    lives -= 1;
    if (lives <= 0) {
      setState("gameover", { lives: 0 });
    } else {
      resetFrog();
      onState("playing", hudSnapshot());
    }
  }

  // ---------- update ----------

  function update(dt) {
    if (phase !== "playing") return;

    if (frog.hopAnim > 0) frog.hopAnim = Math.max(0, frog.hopAnim - dt);
    if (frog.invuln > 0) frog.invuln = Math.max(0, frog.invuln - dt);

    for (const row of Object.keys(LANES)) {
      lanePhase[row] += LANES[row].dir * LANES[row].speed * dt;
    }

    lifeTimer -= dt;
    if (lifeTimer <= 0) {
      killFrog();
      return;
    }

    if (ROAD_ROWS.has(frog.row)) {
      const hb = frogHitbox();
      for (const o of laneObstacles(frog.row)) {
        if (aabbOverlap(hb, obstacleHitbox(o))) {
          killFrog();
          return;
        }
      }
    } else if (RIVER_ROWS.has(frog.row)) {
      const hb = frogHitbox();
      let onLog = null;
      for (const o of laneObstacles(frog.row)) {
        if (aabbOverlap(hb, obstacleHitbox(o))) {
          onLog = o;
          break;
        }
      }
      if (!onLog) {
        killFrog();
        return;
      }
      frog.x += LANES[frog.row].dir * LANES[frog.row].speed * dt;
      if (frog.x < -CELL / 2 || frog.x > LOGICAL_W + CELL / 2) {
        killFrog();
        return;
      }
    }

    onState("playing", hudSnapshot());
  }

  // ---------- render ----------

  function drawBackground() {
    ctx.fillStyle = "#1c1f26";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    const bandColor = (row) => {
      if (row === START_ROW || row === MEDIAN_ROW || row === HOME_ROW) return "#1e3a24";
      if (ROAD_ROWS.has(row)) return "#2c2f36";
      if (RIVER_ROWS.has(row)) return "#1c3a52";
      return "#1c1f26";
    };
    for (let row = 0; row < ROWS; row++) {
      ctx.fillStyle = bandColor(row);
      ctx.fillRect(0, rowY(row) - CELL / 2, LOGICAL_W, CELL);
    }

    ctx.fillStyle = "#12241a";
    for (const col of HOME_SLOT_COLS) {
      ctx.fillRect(col * CELL + (CELL - HOME_SLOT_W) / 2, rowY(HOME_ROW) - CELL / 2 + 4, HOME_SLOT_W, CELL - 8);
    }
    for (let i = 0; i < homesFilled.length; i++) {
      if (homesFilled[i]) {
        ctx.fillStyle = "#7dffb3";
        ctx.beginPath();
        ctx.arc(colX(HOME_SLOT_COLS[i]), rowY(HOME_ROW), 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawLanes() {
    for (const row of Object.keys(LANES)) {
      for (const o of laneObstacles(Number(row))) {
        ctx.fillStyle = o.color;
        ctx.fillRect(o.x - o.w / 2, o.y - CELL * 0.32, o.w, CELL * 0.64);
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(o.x - o.w / 2 + 4, o.y - CELL * 0.32 + 4, o.w - 8, 6);
      }
    }
  }

  function drawFrog() {
    if (frog.invuln > 0 && Math.floor(frog.invuln * 14) % 2 === 0) return;
    const bounce = Math.sin((1 - frog.hopAnim / HOP_ANIM) * Math.PI) * (frog.hopAnim > 0 ? 8 : 0);
    const y = rowY(frog.row) - bounce;
    ctx.fillStyle = "#5ee08a";
    ctx.beginPath();
    ctx.ellipse(frog.x, y, FROG_SIZE / 2, FROG_SIZE / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a6b3f";
    ctx.beginPath();
    ctx.arc(frog.x - 8, y - 10, 4, 0, Math.PI * 2);
    ctx.arc(frog.x + 8, y - 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHud() {
    ctx.fillStyle = "rgba(230, 245, 250, 0.92)";
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`x${Math.max(0, lives)}`, 10, 20);

    ctx.textAlign = "right";
    const pct = Math.max(0, lifeTimer / LIFE_TIME);
    ctx.fillStyle = pct < 0.3 ? "#ff6b5e" : "rgba(230,245,250,0.85)";
    ctx.fillText(`${Math.ceil(Math.max(0, lifeTimer))}s`, LOGICAL_W - 10, 20);
  }

  function render() {
    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);
    drawBackground();
    drawLanes();
    drawFrog();
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

  return { startOrRestart, destroy, tryHop };
}
