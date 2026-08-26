import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// A from-scratch Volfied homage (Taito, 1989 — a Qix descendant). Core
// mechanic: draw a line from claimed ground out into open territory and
// back; on reconnecting, everything NOT connected to the boss enemy
// (flood-fill from its position) gets claimed. Touching your own trail
// is instant death; an enemy touching your trail gives a brief grace
// window to finish the shape before it's fatal — verified against
// multiple mechanical write-ups of the original before building this,
// since "just Snake with extra steps" would not actually be this game.
export function createVolfiedEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const LOGICAL_W = 800;
  const LOGICAL_H = 600;
  const ASPECT = LOGICAL_W / LOGICAL_H;
  const CELL = 8;
  const COLS = LOGICAL_W / CELL;
  const ROWS = LOGICAL_H / CELL;
  const BORDER = 4;

  const GROUND_SPEED = 230;
  const DRAW_SPEED = 175;
  const SPEED_BOOST_MULT = 1.6;
  const GRACE_SECONDS = 1.0;
  const START_LIVES = 3;
  const CLEAR_PERCENT = 80;
  const MAX_LEVEL = 5;

  const particles = createParticleSystem();
  const shake = createScreenShake();

  // Static logical-resolution buffer for claimed territory — repainting
  // up to 7500 cells every single frame would be wasteful, so claimed
  // cells are drawn once onto this layer when they change, and the main
  // frame just blits it.
  const claimedLayer = document.createElement("canvas");
  claimedLayer.width = LOGICAL_W;
  claimedLayer.height = LOGICAL_H;
  const claimedCtx = claimedLayer.getContext("2d");

  const stars = Array.from({ length: 70 }, () => ({
    x: Math.random() * LOGICAL_W,
    y: Math.random() * LOGICAL_H,
    r: Math.random() * 1.4 + 0.3,
    a: Math.random() * 0.5 + 0.2,
  }));

  let scale = 1;
  let state = "title";
  let grid = new Uint8Array(COLS * ROWS); // 0 open, 1 claimed, 2 trail
  let level = 1;
  let lives = START_LIVES;
  let score = 0;
  let percent = 0;

  const player = { x: LOGICAL_W / 2, y: BORDER * CELL, dir: 0 };
  let drawing = false;
  // Self-collision needs an "age" per cell, not just membership: continuous
  // forward movement naturally lands on cells marked by the player's own
  // last frame or two, which is not a real loop-back. Only cells older than
  // SELF_COLLISION_IGNORE_RECENT (in trail-order, not wall-clock) count.
  let trailCellOrder = new Map(); // idx -> sequence number
  let trailSeq = 0;
  const SELF_COLLISION_IGNORE_RECENT = 14;
  let graceTimer = null;
  let respawnInvuln = 0;
  let levelAnnounce = 0;

  let shieldTimer = 0;
  let speedTimer = 0;
  let enemyFreezeTimer = 0;

  let boss = null;
  let smallEnemies = [];
  let blocks = [];

  function setState(next, extra) {
    state = next;
    onState(next, extra);
  }

  function cellIndex(cx, cy) {
    return cy * COLS + cx;
  }
  function cellAt(px, py) {
    const cx = Math.min(COLS - 1, Math.max(0, Math.floor(px / CELL)));
    const cy = Math.min(ROWS - 1, Math.max(0, Math.floor(py / CELL)));
    return { cx, cy };
  }
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function paintClaimedCell(cx, cy) {
    claimedCtx.fillStyle = "#0d3d4a";
    claimedCtx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    claimedCtx.strokeStyle = "rgba(79, 227, 255, 0.18)";
    claimedCtx.strokeRect(cx * CELL + 0.5, cy * CELL + 0.5, CELL - 1, CELL - 1);
  }

  function buildLevel(n) {
    grid = new Uint8Array(COLS * ROWS);
    claimedCtx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

    for (let cy = 0; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        if (cx < BORDER || cy < BORDER || cx >= COLS - BORDER || cy >= ROWS - BORDER) {
          grid[cellIndex(cx, cy)] = 1;
          paintClaimedCell(cx, cy);
        }
      }
    }

    player.x = LOGICAL_W / 2;
    player.y = BORDER * CELL;
    drawing = false;
    trailCellOrder = new Map();
    trailSeq = 0;
    graceTimer = null;
    shieldTimer = 0;
    speedTimer = 0;
    enemyFreezeTimer = 0;
    levelAnnounce = 1.6;

    const enemyCount = Math.min(5, 2 + n);
    const enemySpeed = 55 + n * 10;
    smallEnemies = Array.from({ length: enemyCount }, () => spawnEnemy(enemySpeed, 9));
    boss = spawnEnemy(enemySpeed * 0.8, 16);
    boss.isBoss = true;

    const types = ["P", "T", "S", "L"];
    blocks = types.map((type) => ({
      x: LOGICAL_W * (0.25 + Math.random() * 0.5),
      y: LOGICAL_H * (0.25 + Math.random() * 0.5),
      type,
      active: true,
    }));

    recomputePercent();
  }

  function spawnEnemy(speed, r) {
    const margin = (BORDER + 3) * CELL;
    const x = margin + Math.random() * (LOGICAL_W - margin * 2);
    const y = margin + Math.random() * (LOGICAL_H - margin * 2);
    const angle = Math.random() * Math.PI * 2;
    return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, alive: true };
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
  function beep(freq, duration, type = "square") {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.13, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }
  const sound = {
    capture: () => beep(520, 0.18),
    death: () => beep(100, 0.5),
    powerup: () => beep(760, 0.15),
    kill: () => beep(340, 0.1),
    grace: () => beep(880, 0.05),
    level: () => beep(660, 0.3),
  };

  // ---------- input ----------
  const keys = { up: false, down: false, left: false, right: false };
  function onKeyDown(e) {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = true;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = true;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  }
  function onKeyUp(e) {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = false;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = false;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  let joystickVec = { x: 0, y: 0 };
  function setJoystick(x, y) {
    joystickVec = { x, y };
  }

  function getInputDir() {
    if (joystickVec.x !== 0 || joystickVec.y !== 0) return joystickVec;
    let dx = 0;
    let dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (dx === 0 && dy === 0) return { x: 0, y: 0 };
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  }

  function startOrRestart() {
    ensureAudio();
    if (state === "title" || state === "gameover") {
      level = 1;
      lives = START_LIVES;
      score = 0;
      buildLevel(level);
      setState("playing");
    }
  }

  function markTrailAlongSegment(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / (CELL / 2)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const { cx, cy } = cellAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      const idx = cellIndex(cx, cy);
      if (grid[idx] === 0) {
        grid[idx] = 2;
        trailSeq += 1;
        trailCellOrder.set(idx, trailSeq);
      }
    }
  }

  function floodFillOpenFrom(x, y) {
    const { cx, cy } = cellAt(x, y);
    const startIdx = cellIndex(cx, cy);
    const visited = new Set();
    if (grid[startIdx] !== 0) return visited;
    const stack = [startIdx];
    visited.add(startIdx);
    while (stack.length) {
      const idx = stack.pop();
      const x2 = idx % COLS;
      const y2 = Math.floor(idx / COLS);
      const neighbors = [];
      if (x2 > 0) neighbors.push(idx - 1);
      if (x2 < COLS - 1) neighbors.push(idx + 1);
      if (y2 > 0) neighbors.push(idx - COLS);
      if (y2 < ROWS - 1) neighbors.push(idx + COLS);
      for (const n of neighbors) {
        if (!visited.has(n) && grid[n] === 0) {
          visited.add(n);
          stack.push(n);
        }
      }
    }
    return visited;
  }

  function recomputePercent() {
    let claimed = 0;
    for (let i = 0; i < grid.length; i++) if (grid[i] === 1) claimed++;
    percent = (claimed / grid.length) * 100;
  }

  function killSmallEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    score += 250;
    particles.burst(e.x, e.y, { color: "#ff8a3d", count: 16, speed: 160 });
    sound.kill();
  }

  function activatePowerUp(type) {
    sound.powerup();
    particles.burst(player.x, player.y, { color: "#ffe066", count: 20, speed: 180 });
    if (type === "P") shieldTimer = 6;
    else if (type === "T") enemyFreezeTimer = 4;
    else if (type === "S") speedTimer = 6;
    else if (type === "L") {
      for (const e of smallEnemies) killSmallEnemy(e);
    }
  }

  function finalizeCapture() {
    if (!drawing) return;
    const cellsToClear = [...trailCellOrder.keys()];
    for (const idx of cellsToClear) grid[idx] = 1;
    trailCellOrder = new Map();
    trailSeq = 0;
    drawing = false;
    graceTimer = null;

    const stillOpen = floodFillOpenFrom(boss.x, boss.y);
    let newlyClaimed = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 0 && !stillOpen.has(i)) {
        grid[i] = 1;
        newlyClaimed++;
      }
    }
    for (const idx of cellsToClear) paintClaimedCell(idx % COLS, Math.floor(idx / COLS));

    if (newlyClaimed > 0) {
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] === 1) paintClaimedCell(i % COLS, Math.floor(i / COLS));
      }
      for (const e of smallEnemies) {
        if (!e.alive) continue;
        const { cx, cy } = cellAt(e.x, e.y);
        if (grid[cellIndex(cx, cy)] === 1) killSmallEnemy(e);
      }
      for (const block of blocks) {
        if (!block.active) continue;
        const { cx, cy } = cellAt(block.x, block.y);
        if (grid[cellIndex(cx, cy)] === 1) {
          block.active = false;
          activatePowerUp(block.type);
        }
      }
      score += newlyClaimed;
      sound.capture();
      shake.trigger(4, 0.2);
      particles.burst(player.x, player.y, { color: "#4fe3ff", count: 24, speed: 200, life: 0.6 });
    }

    recomputePercent();
    if (percent >= CLEAR_PERCENT) {
      if (level >= MAX_LEVEL) {
        sound.level();
        setState("gameover", { text: "FIELD SECURED", score, victory: true });
      } else {
        level += 1;
        sound.level();
        buildLevel(level);
      }
    }
  }

  function die() {
    for (const idx of trailCellOrder.keys()) grid[idx] = 0;
    trailCellOrder = new Map();
    trailSeq = 0;
    drawing = false;
    graceTimer = null;
    sound.death();
    shake.trigger(9, 0.4);
    particles.burst(player.x, player.y, { color: "#ff4d6d", count: 28, speed: 220, life: 0.7 });
    lives -= 1;
    if (lives <= 0) {
      setState("gameover", { text: "DESTROYED", score });
    } else {
      player.x = LOGICAL_W / 2;
      player.y = BORDER * CELL;
      respawnInvuln = 1.5;
    }
  }

  function checkTrailHazards() {
    if (!drawing || shieldTimer > 0) {
      graceTimer = null;
      return;
    }
    const allEnemies = boss ? [boss, ...smallEnemies].filter((e) => e.alive) : [];
    let touched = false;
    outer: for (const e of allEnemies) {
      for (const idx of trailCellOrder.keys()) {
        const cx = (idx % COLS) * CELL + CELL / 2;
        const cy = Math.floor(idx / COLS) * CELL + CELL / 2;
        if (Math.hypot(e.x - cx, e.y - cy) < e.r + CELL * 0.6) {
          touched = true;
          break outer;
        }
      }
    }
    if (touched && graceTimer === null) {
      graceTimer = GRACE_SECONDS;
      sound.grace();
    }
  }

  function updatePlayer(dt) {
    if (respawnInvuln > 0) respawnInvuln -= dt;
    if (shieldTimer > 0) shieldTimer -= dt;
    if (speedTimer > 0) speedTimer -= dt;
    if (levelAnnounce > 0) levelAnnounce -= dt;

    const input = getInputDir();
    if (graceTimer !== null) {
      graceTimer -= dt;
      if (graceTimer <= 0) {
        die();
        return;
      }
    }
    if (input.x === 0 && input.y === 0) return;

    player.dir = Math.atan2(input.y, input.x);
    const baseSpeed = drawing ? DRAW_SPEED : GROUND_SPEED;
    const speed = baseSpeed * (speedTimer > 0 ? SPEED_BOOST_MULT : 1);
    const nx = clamp(player.x + input.x * speed * dt, 0, LOGICAL_W - 1);
    const ny = clamp(player.y + input.y * speed * dt, 0, LOGICAL_H - 1);
    const { cx, cy } = cellAt(nx, ny);
    const cellState = grid[cellIndex(cx, cy)];

    if (cellState === 1) {
      if (drawing) finalizeCapture();
      player.x = nx;
      player.y = ny;
      return;
    }

    if (cellState === 2) {
      const markedAt = trailCellOrder.get(cellIndex(cx, cy));
      const age = markedAt === undefined ? 0 : trailSeq - markedAt;
      if (age > SELF_COLLISION_IGNORE_RECENT) {
        die();
        return;
      }
      // Otherwise this is just the player's own last frame or two of
      // forward progress re-touching cells it marked a moment ago — not a
      // real loop-back, so fall through and keep drawing normally.
    }

    if (!drawing) {
      drawing = true;
      trailCellOrder = new Map();
      trailSeq = 0;
    }
    markTrailAlongSegment(player.x, player.y, nx, ny);
    player.x = nx;
    player.y = ny;
    checkTrailHazards();
  }

  function updateEnemies(dt) {
    if (enemyFreezeTimer > 0) {
      enemyFreezeTimer -= dt;
      return;
    }
    const all = boss ? [boss, ...smallEnemies] : [];
    for (const e of all) {
      if (!e.alive) continue;
      let nx = e.x + e.vx * dt;
      let ny = e.y + e.vy * dt;
      const { cx: cx1, cy: cy1 } = cellAt(nx, e.y);
      if (grid[cellIndex(cx1, cy1)] === 1 || nx < e.r || nx > LOGICAL_W - e.r) {
        e.vx *= -1;
        nx = e.x;
      }
      const { cx: cx2, cy: cy2 } = cellAt(e.x, ny);
      if (grid[cellIndex(cx2, cy2)] === 1 || ny < e.r || ny > LOGICAL_H - e.r) {
        e.vy *= -1;
        ny = e.y;
      }
      e.x = nx;
      e.y = ny;
      if (Math.random() < 0.01) {
        const jitter = (Math.random() - 0.5) * 0.6;
        const speed = Math.hypot(e.vx, e.vy);
        const angle = Math.atan2(e.vy, e.vx) + jitter;
        e.vx = Math.cos(angle) * speed;
        e.vy = Math.sin(angle) * speed;
      }
    }
  }

  function draw() {
    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);

    ctx.fillStyle = "#050512";
    ctx.fillRect(-10, -10, LOGICAL_W + 20, LOGICAL_H + 20);
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = "#bcd8ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.drawImage(claimedLayer, 0, 0);

    ctx.fillStyle = "rgba(255, 79, 216, 0.85)";
    for (const idx of trailCellOrder.keys()) {
      ctx.fillRect((idx % COLS) * CELL, Math.floor(idx / COLS) * CELL, CELL, CELL);
    }

    if (state !== "title") {
      for (const block of blocks) {
        if (!block.active) continue;
        ctx.fillStyle = "#1a1a2e";
        ctx.strokeStyle = "#ffe066";
        ctx.lineWidth = 1.5;
        ctx.fillRect(block.x - 9, block.y - 9, 18, 18);
        ctx.strokeRect(block.x - 9, block.y - 9, 18, 18);
        ctx.fillStyle = "#ffe066";
        ctx.font = "12px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(block.type, block.x, block.y + 1);
      }
      ctx.textBaseline = "alphabetic";

      if (boss && boss.alive) {
        ctx.fillStyle = enemyFreezeTimer > 0 ? "#7de8ff" : "#5ee6a0";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      for (const e of smallEnemies) {
        if (!e.alive) continue;
        ctx.fillStyle = enemyFreezeTimer > 0 ? "#7de8ff" : "#ff8a3d";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const blink = respawnInvuln > 0 && Math.floor(respawnInvuln * 10) % 2 === 0;
      if (!blink) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.dir);
        ctx.fillStyle = shieldTimer > 0 ? "#ffe066" : "#4fe3ff";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-6, 6);
        ctx.lineTo(-6, -6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      if (graceTimer !== null) {
        ctx.fillStyle = "rgba(255, 77, 109, 0.8)";
        ctx.font = "bold 18px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("!", player.x, player.y - 16);
      }
    }

    particles.draw(ctx);

    ctx.textAlign = "left";
    ctx.font = "18px 'Courier New', monospace";
    ctx.fillStyle = "rgba(190, 226, 255, 0.9)";
    ctx.fillText(`Score ${score}`, 12, 22);
    ctx.fillText(`Lv ${level}`, 12, 42);
    ctx.textAlign = "right";
    ctx.fillText(`${percent.toFixed(1)}% / ${CLEAR_PERCENT}%`, LOGICAL_W - 12, 22);
    ctx.fillText(`${"♦".repeat(Math.max(0, lives))}`, LOGICAL_W - 12, 42);
    ctx.textAlign = "center";
    if (levelAnnounce > 0) {
      ctx.font = "bold 28px 'Courier New', monospace";
      ctx.fillStyle = `rgba(79, 227, 255, ${Math.min(1, levelAnnounce)})`;
      ctx.fillText(`SECTOR ${level}`, LOGICAL_W / 2, LOGICAL_H / 2 - 40);
    }

    ctx.restore();
  }

  let lastTime = performance.now();
  let rafId = null;
  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 1 / 30);

    if (state === "playing") {
      updatePlayer(dt);
      updateEnemies(dt);
    }
    particles.update(dt);
    shake.update(dt);
    draw();
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
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart, setJoystick, destroy };
}
