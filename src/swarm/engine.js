import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// A from-scratch formation-shooter homage (Galaga-shaped, original content).
// Same portrait fixed-shooter shape as Salvo (logical coordinate space +
// DPR scaling, RAF loop, onState callback, mouse/touch-drag steering), but
// the defining difference is enemies that peel off formation and dive at
// the player in a curved swoop instead of just marching and firing in
// place — plus continuous fire instead of Salvo's one-bullet-at-a-time rule.
export function createSwarmEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const LOGICAL_W = 640;
  const LOGICAL_H = 800;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const ROWS = 4;
  const COLS = 8;
  const ENEMY_W = 30;
  const ENEMY_H = 20;
  const GAP_X = 16;
  const GAP_Y = 18;
  const FORMATION_TOP = 110;
  const ROW_COLORS = ["#ff6b5e", "#ffb74d", "#c77dff", "#7dffb3"];
  const ROW_POINTS = [40, 30, 20, 10];

  const PLAYER_W = 40;
  const PLAYER_H = 18;
  const PLAYER_Y = LOGICAL_H - 60;
  const PLAYER_SPEED = 340;
  const BULLET_SPEED = 560;
  const FIRE_COOLDOWN = 0.16;
  const ENEMY_BULLET_SPEED = 260;
  const START_LIVES = 4;
  const RESPAWN_INVULN = 1.4;

  const WAVE_COUNT = 3;
  const DIVE_INTERVAL_BASE = [2.0, 3.6];
  const DIVE_DURATION_BASE = 2.3;

  const particles = createParticleSystem();
  const shake = createScreenShake();

  let scale = 1;
  let phase = "title";
  let lives = START_LIVES;
  let wave = 1;
  let waveAnnounce = 0;

  const player = { x: LOGICAL_W / 2 - PLAYER_W / 2, y: PLAYER_Y, targetX: LOGICAL_W / 2, invuln: 0, fireCooldown: 0 };
  let playerBullets = [];
  let enemyBullets = [];
  let enemies = [];
  let diveTimer = 2;
  let formationTime = 0;

  function setState(next, extra) {
    phase = next;
    onState(next, extra);
  }

  function buildFormation() {
    enemies = [];
    const totalW = COLS * ENEMY_W + (COLS - 1) * GAP_X;
    const startX = (LOGICAL_W - totalW) / 2;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const slotX = startX + col * (ENEMY_W + GAP_X);
        const slotY = FORMATION_TOP + row * (ENEMY_H + GAP_Y);
        enemies.push({
          row,
          col,
          slotX,
          slotY,
          x: slotX,
          y: slotY,
          alive: true,
          state: "entering",
          t: 0,
          enterDelay: (row * COLS + col) * 0.035,
        });
      }
    }
    diveTimer = 1.2 + Math.random() * 1.2;
    formationTime = 0;
  }

  function startWave(n) {
    wave = n;
    buildFormation();
    enemyBullets = [];
    playerBullets = [];
    waveAnnounce = 1.6;
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
  function playerHitbox() {
    return { x1: player.x, x2: player.x + PLAYER_W, y1: player.y, y2: player.y + PLAYER_H };
  }
  function enemyHitbox(e) {
    return { x1: e.x, x2: e.x + ENEMY_W, y1: e.y, y2: e.y + ENEMY_H };
  }
  function bulletHitbox(b) {
    return { x1: b.x - 3, x2: b.x + 3, y1: b.y - 7, y2: b.y + 7 };
  }

  function clientToLogicalX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * LOGICAL_W;
  }
  function setPlayerTarget(clientX) {
    player.targetX = clientToLogicalX(clientX);
  }

  function fire() {
    if (phase !== "playing" || player.fireCooldown > 0) return;
    ensureAudio();
    playerBullets.push({ x: player.x + PLAYER_W / 2, y: player.y - 6 });
    player.fireCooldown = FIRE_COOLDOWN;
    beep(680, 0.05, "square", 0.05);
  }

  const keys = { left: false, right: false, fire: false };
  function onKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    else if (e.key === "z" || e.key === "Z" || e.key === "x" || e.key === "X") {
      ensureAudio();
      keys.fire = true;
    } else if (e.key === " " || e.key === "ArrowUp") {
      e.preventDefault();
      if (phase === "title" || phase === "gameover" || phase === "win") startOrRestart();
      else keys.fire = true;
    }
  }
  function onKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    else if (e.key === "z" || e.key === "Z" || e.key === "x" || e.key === "X" || e.key === " " || e.key === "ArrowUp") keys.fire = false;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function onMouseMove(e) {
    setPlayerTarget(e.clientX);
  }
  window.addEventListener("mousemove", onMouseMove);

  let touchStartPos = null;
  let touchDragging = false;
  function onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (t) {
      touchStartPos = { x: t.clientX, y: t.clientY };
      touchDragging = false;
      setPlayerTarget(t.clientX);
    }
  }
  function onTouchDrag(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (t) {
      if (touchStartPos && Math.hypot(t.clientX - touchStartPos.x, t.clientY - touchStartPos.y) > 8) touchDragging = true;
      setPlayerTarget(t.clientX);
      keys.fire = true;
    }
  }
  function onTouchEnd() {
    keys.fire = false;
    if (phase === "title" || phase === "gameover" || phase === "win") {
      if (touchStartPos && !touchDragging) startOrRestart();
    }
    touchStartPos = null;
  }
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchDrag, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd);

  function onCanvasClick() {
    if (phase === "title" || phase === "gameover" || phase === "win") startOrRestart();
  }
  canvas.addEventListener("pointerdown", onCanvasClick);

  function startOrRestart() {
    ensureAudio();
    lives = START_LIVES;
    player.x = LOGICAL_W / 2 - PLAYER_W / 2;
    player.targetX = LOGICAL_W / 2;
    player.invuln = 0;
    startWave(1);
    setState("playing", { lives, wave });
  }

  function hudSnapshot() {
    return { lives, wave };
  }

  function loseLife() {
    beep(120, 0.2, "sawtooth", 0.14);
    shake.trigger(9, 0.32);
    particles.burst(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, { color: "#7dc4ff", count: 22, speed: 190, life: 0.55 });
    lives -= 1;
    if (lives <= 0) {
      setState("gameover", { lives: 0, wave });
    } else {
      player.invuln = RESPAWN_INVULN;
      onState("playing", hudSnapshot());
    }
  }

  // ---------- update ----------

  function updatePlayer(dt) {
    if (player.invuln > 0) player.invuln -= dt;
    if (keys.left) player.targetX = player.x + PLAYER_W / 2 - PLAYER_SPEED * dt;
    if (keys.right) player.targetX = player.x + PLAYER_W / 2 + PLAYER_SPEED * dt;
    const desiredX = clamp(player.targetX - PLAYER_W / 2, 0, LOGICAL_W - PLAYER_W);
    player.x += (desiredX - player.x) * Math.min(1, dt * 16);

    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    if (keys.fire) fire();
  }

  function diveParamsForWave() {
    const speedUp = 1 + (wave - 1) * 0.22;
    return {
      duration: DIVE_DURATION_BASE / speedUp,
      intervalMin: DIVE_INTERVAL_BASE[0] / speedUp,
      intervalMax: DIVE_INTERVAL_BASE[1] / speedUp,
    };
  }

  function startDive(e) {
    e.state = "diving";
    e.t = 0;
    e.diveFrom = { x: e.x, y: e.y };
    e.diveTarget = clamp(player.x + PLAYER_W / 2, 40, LOGICAL_W - 40);
    e.diveControl = {
      x: e.diveFrom.x + (e.diveTarget - e.diveFrom.x) * 0.35,
      y: e.diveFrom.y + 240,
    };
    e.diveFired = false;
  }

  function updateEnemies(dt) {
    formationTime += dt;
    const wobble = Math.sin(formationTime * 1.1) * 18;
    const { duration } = diveParamsForWave();

    const alive = enemies.filter((e) => e.alive);
    if (alive.length === 0) return;

    diveTimer -= dt;
    if (diveTimer <= 0) {
      const candidates = alive.filter((e) => e.state === "formation");
      if (candidates.length) {
        startDive(candidates[Math.floor(Math.random() * candidates.length)]);
      }
      const p = diveParamsForWave();
      diveTimer = p.intervalMin + Math.random() * (p.intervalMax - p.intervalMin);
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.state === "entering") {
        e.t += dt;
        if (e.t < e.enterDelay) continue;
        const localT = clamp((e.t - e.enterDelay) / 0.7, 0, 1);
        const ease = 1 - Math.pow(1 - localT, 3);
        e.y = -ENEMY_H - 20 + (e.slotY - (-ENEMY_H - 20)) * ease;
        e.x = e.slotX + Math.sin(localT * Math.PI * 2) * 30 * (1 - localT);
        if (localT >= 1) {
          e.state = "formation";
          e.x = e.slotX;
          e.y = e.slotY;
        }
      } else if (e.state === "formation") {
        e.x = e.slotX + wobble;
        e.y = e.slotY;
      } else if (e.state === "diving") {
        e.t += dt / duration;
        const t = Math.min(1, e.t);
        const mt = 1 - t;
        e.x = mt * mt * e.diveFrom.x + 2 * mt * t * e.diveControl.x + t * t * e.diveTarget;
        e.y = mt * mt * e.diveFrom.y + 2 * mt * t * e.diveControl.y + t * t * (LOGICAL_H + 40);
        if (!e.diveFired && t > 0.4) {
          e.diveFired = true;
          const dx = player.x + PLAYER_W / 2 - e.x;
          const dy = player.y - e.y;
          const len = Math.hypot(dx, dy) || 1;
          enemyBullets.push({ x: e.x + ENEMY_W / 2, y: e.y + ENEMY_H, vx: (dx / len) * ENEMY_BULLET_SPEED, vy: (dy / len) * ENEMY_BULLET_SPEED });
          beep(220, 0.08, "sawtooth", 0.08);
        }
        if (t >= 1) {
          e.state = "formation";
          e.x = e.slotX;
          e.y = e.slotY;
        }
      }
    }
  }

  function updateBullets(dt) {
    for (const b of playerBullets) b.y += -BULLET_SPEED * dt;
    for (const b of enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    for (const b of playerBullets) {
      if (b.dead) continue;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (aabbOverlap(bulletHitbox(b), enemyHitbox(e))) {
          e.alive = false;
          b.dead = true;
          shake.trigger(e.state === "diving" ? 4 : 2, 0.15);
          particles.burst(e.x + ENEMY_W / 2, e.y + ENEMY_H / 2, { color: ROW_COLORS[e.row], count: 16, speed: 170, life: 0.4 });
          beep(300 + (ROWS - e.row) * 60, 0.1, "square", 0.09);
          break;
        }
      }
    }
    playerBullets = playerBullets.filter((b) => !b.dead && b.y > -20);
    enemyBullets = enemyBullets.filter((b) => b.y < LOGICAL_H + 20 && b.y > -20 && b.x > -20 && b.x < LOGICAL_W + 20);

    if (phase === "playing" && player.invuln <= 0) {
      for (const e of enemies) {
        if (e.alive && e.state === "diving" && aabbOverlap(playerHitbox(), enemyHitbox(e))) {
          loseLife();
          return;
        }
      }
      for (const b of enemyBullets) {
        if (aabbOverlap(playerHitbox(), bulletHitbox(b))) {
          b.dead = true;
          loseLife();
          break;
        }
      }
      enemyBullets = enemyBullets.filter((b) => !b.dead);
    }
  }

  function update(dt) {
    if (waveAnnounce > 0) waveAnnounce -= dt;
    if (phase !== "playing") return;

    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    if (phase !== "playing") return;

    const remaining = enemies.filter((e) => e.alive).length;
    if (remaining === 0) {
      if (wave >= WAVE_COUNT) {
        beep(700, 0.4, "triangle", 0.16);
        setState("win", { lives, wave });
        return;
      }
      beep(500, 0.3, "triangle", 0.14);
      startWave(wave + 1);
      onState("playing", hudSnapshot());
      return;
    }

    onState("playing", hudSnapshot());
  }

  // ---------- render ----------

  function drawEnemy(e) {
    ctx.fillStyle = ROW_COLORS[e.row];
    ctx.shadowColor = ROW_COLORS[e.row];
    ctx.shadowBlur = e.state === "diving" ? 10 : 4;
    const w = ENEMY_W;
    const h = ENEMY_H;
    ctx.fillRect(e.x + w * 0.2, e.y, w * 0.6, h * 0.35);
    ctx.fillRect(e.x, e.y + h * 0.35, w, h * 0.4);
    ctx.fillRect(e.x + w * 0.1, e.y + h * 0.75, w * 0.22, h * 0.25);
    ctx.fillRect(e.x + w * 0.68, e.y + h * 0.75, w * 0.22, h * 0.25);
    ctx.shadowBlur = 0;
  }

  function draw() {
    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);

    ctx.fillStyle = "#0a0714";
    ctx.fillRect(-10, -10, LOGICAL_W + 20, LOGICAL_H + 20);

    if (phase !== "title") {
      for (const e of enemies) if (e.alive) drawEnemy(e);

      const blink = player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = "#8ec9ff";
        ctx.shadowColor = "#8ec9ff";
        ctx.shadowBlur = 8;
        ctx.fillRect(player.x + PLAYER_W * 0.4, player.y, PLAYER_W * 0.2, PLAYER_H * 0.5);
        ctx.fillRect(player.x, player.y + PLAYER_H * 0.5, PLAYER_W, PLAYER_H * 0.5);
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = "#fff3d6";
      for (const b of playerBullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);

      ctx.fillStyle = "#ff8a3d";
      for (const b of enemyBullets) ctx.fillRect(b.x - 2, b.y - 6, 4, 10);
    }

    particles.draw(ctx);

    ctx.font = "20px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(230, 220, 255, 0.9)";
    ctx.fillText(`x${Math.max(0, lives)}`, 14, 28);
    ctx.textAlign = "right";
    ctx.fillText(`wave ${wave}/${WAVE_COUNT}`, LOGICAL_W - 14, 28);

    ctx.textAlign = "center";
    if (waveAnnounce > 0) {
      ctx.font = "bold 26px 'Courier New', monospace";
      ctx.fillStyle = `rgba(199, 125, 255, ${Math.min(1, waveAnnounce)})`;
      ctx.fillText(`WAVE ${wave}`, LOGICAL_W / 2, LOGICAL_H / 2 - 60);
    }

    ctx.restore();
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
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchDrag);
    canvas.removeEventListener("touchend", onTouchEnd);
    canvas.removeEventListener("pointerdown", onCanvasClick);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart, destroy };
}
