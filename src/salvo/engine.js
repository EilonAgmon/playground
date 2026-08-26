import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// A from-scratch Space Invaders homage. Same architecture as the other
// canvas games (logical coordinate space + scaling, requestAnimationFrame
// loop, onState callback for React overlays). Portrait orientation on
// purpose — it's the one game in the set that actually suits a phone
// held normally, no landscape rotation needed.
export function createSalvoEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const LOGICAL_W = 640;
  const LOGICAL_H = 800;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const ROWS = 5;
  const COLS = 8;
  const INVADER_W = 30;
  const INVADER_H = 20;
  const GAP_X = 14;
  const GAP_Y = 16;
  const FORMATION_TOP = 90;
  const ROW_POINTS = [30, 20, 20, 10, 10];
  const ROW_COLORS = ["#ff6b5e", "#ffb74d", "#ffb74d", "#ffe066", "#ffe066"];

  const PLAYER_W = 40;
  const PLAYER_H = 18;
  const PLAYER_Y = LOGICAL_H - 56;
  const PLAYER_SPEED = 320;
  const PLAYER_BULLET_SPEED = 520;
  const INVADER_BULLET_SPEED = 210;
  const START_LIVES = 3;
  const RESPAWN_INVULN = 1.3;

  const SHIELD_COLS = 7;
  const SHIELD_ROWS = 5;
  const SHIELD_BLOCK = 7;
  const SHIELD_Y = LOGICAL_H - 150;

  const particles = createParticleSystem();
  const shake = createScreenShake();

  let scale = 1;
  let state = "title";
  let score = 0;
  let lives = START_LIVES;
  let wave = 1;
  let waveAnnounce = 0;

  const player = { x: LOGICAL_W / 2 - PLAYER_W / 2, y: PLAYER_Y, targetX: LOGICAL_W / 2, invuln: 0 };
  let playerBullet = null;
  let invaderBullets = [];
  let invaders = [];
  let direction = 1;
  let stepTimer = 0;
  let stepInterval = 0.85;
  let shields = [];
  let mysteryShip = null;
  let mysteryTimer = 8;

  function setState(next, extra) {
    state = next;
    onState(next, extra);
  }

  function buildInvaders() {
    invaders = [];
    const totalW = COLS * INVADER_W + (COLS - 1) * GAP_X;
    const startX = (LOGICAL_W - totalW) / 2;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        invaders.push({
          x: startX + col * (INVADER_W + GAP_X),
          y: FORMATION_TOP + row * (INVADER_H + GAP_Y),
          row,
          col,
          alive: true,
        });
      }
    }
    direction = 1;
    stepTimer = 0;
    stepInterval = Math.max(0.3, 0.85 - wave * 0.05);
  }

  function buildShields() {
    const count = 4;
    shields = [];
    const spacing = LOGICAL_W / (count + 1);
    for (let i = 0; i < count; i++) {
      const blocks = new Uint8Array(SHIELD_COLS * SHIELD_ROWS).fill(1);
      // Carve a small arch so it reads as a bunker, not a solid brick.
      blocks[1] = 0;
      blocks[SHIELD_COLS - 2] = 0;
      shields.push({
        x: spacing * (i + 1) - (SHIELD_COLS * SHIELD_BLOCK) / 2,
        y: SHIELD_Y,
        blocks,
      });
    }
  }

  function startWave(n) {
    wave = n;
    buildInvaders();
    invaderBullets = [];
    playerBullet = null;
    mysteryShip = null;
    mysteryTimer = 8 + Math.random() * 8;
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
  function beep(freq, duration, type = "square") {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }
  const sound = {
    shoot: () => beep(660, 0.06),
    invaderShoot: () => beep(180, 0.08, "sawtooth"),
    hit: () => beep(120, 0.18),
    kill: (row) => beep(300 + (4 - row) * 60, 0.12),
    mystery: () => beep(920, 0.25),
    lose: () => beep(90, 0.5),
    wave: () => beep(500, 0.3),
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function clientToLogicalX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * LOGICAL_W;
  }

  function setPlayerTarget(clientX) {
    player.targetX = clientToLogicalX(clientX);
  }

  function fire() {
    if (state !== "playing" || playerBullet) return;
    ensureAudio();
    playerBullet = { x: player.x + PLAYER_W / 2 - 2, y: player.y - 8, vy: -PLAYER_BULLET_SPEED };
    sound.shoot();
  }

  function onMouseMove(e) {
    setPlayerTarget(e.clientX);
  }
  function onClick() {
    fire();
  }
  window.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("click", onClick);

  let touchStartPos = null;
  function onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (t) {
      touchStartPos = { x: t.clientX, y: t.clientY };
      setPlayerTarget(t.clientX);
    }
  }
  function onTouchDrag(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (t) setPlayerTarget(t.clientX);
  }
  function onTouchEnd(e) {
    const t = e.changedTouches[0];
    if (touchStartPos && t) {
      const dx = t.clientX - touchStartPos.x;
      const dy = t.clientY - touchStartPos.y;
      if (Math.hypot(dx, dy) < 14) fire();
    }
    touchStartPos = null;
  }
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchDrag, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd);

  const keys = { left: false, right: false };
  function onKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    if (e.key === " " || e.key === "ArrowUp") {
      e.preventDefault();
      if (state === "title" || state === "gameover") startOrRestart();
      else fire();
    }
  }
  function onKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function startOrRestart() {
    ensureAudio();
    if (state === "title" || state === "gameover") {
      score = 0;
      lives = START_LIVES;
      player.x = LOGICAL_W / 2 - PLAYER_W / 2;
      player.targetX = LOGICAL_W / 2;
      player.invuln = 0;
      buildShields();
      startWave(1);
      setState("playing");
    }
  }

  function onCanvasClickForStart() {
    if (state === "title" || state === "gameover") startOrRestart();
  }
  canvas.addEventListener("pointerdown", onCanvasClickForStart);

  function hitShield(x, y) {
    for (const shield of shields) {
      const localX = x - shield.x;
      const localY = y - shield.y;
      if (localX < 0 || localY < 0) continue;
      const col = Math.floor(localX / SHIELD_BLOCK);
      const row = Math.floor(localY / SHIELD_BLOCK);
      if (col < 0 || col >= SHIELD_COLS || row < 0 || row >= SHIELD_ROWS) continue;
      const idx = row * SHIELD_COLS + col;
      if (shield.blocks[idx]) {
        shield.blocks[idx] = 0;
        return true;
      }
    }
    return false;
  }

  function updatePlayer(dt) {
    if (player.invuln > 0) player.invuln -= dt;
    if (keys.left) player.targetX = player.x + PLAYER_W / 2 - PLAYER_SPEED * dt;
    if (keys.right) player.targetX = player.x + PLAYER_W / 2 + PLAYER_SPEED * dt;
    const desiredX = clamp(player.targetX - PLAYER_W / 2, 0, LOGICAL_W - PLAYER_W);
    player.x += (desiredX - player.x) * Math.min(1, dt * 16);
  }

  function updateBullets(dt) {
    if (playerBullet) {
      playerBullet.y += playerBullet.vy * dt;
      if (playerBullet.y < -10) {
        playerBullet = null;
      } else if (hitShield(playerBullet.x, playerBullet.y)) {
        particles.burst(playerBullet.x, playerBullet.y, { color: "#7dc4ff", count: 6, speed: 90, life: 0.25 });
        playerBullet = null;
      } else {
        for (const inv of invaders) {
          if (!inv.alive) continue;
          if (
            playerBullet &&
            playerBullet.x > inv.x &&
            playerBullet.x < inv.x + INVADER_W &&
            playerBullet.y > inv.y &&
            playerBullet.y < inv.y + INVADER_H
          ) {
            inv.alive = false;
            score += ROW_POINTS[inv.row];
            sound.kill(inv.row);
            particles.burst(inv.x + INVADER_W / 2, inv.y + INVADER_H / 2, {
              color: ROW_COLORS[inv.row],
              count: 14,
              speed: 150,
              life: 0.4,
            });
            playerBullet = null;
            break;
          }
        }
      }
    }
    if (playerBullet && mysteryShip && mysteryShip.active) {
      if (
        playerBullet.x > mysteryShip.x &&
        playerBullet.x < mysteryShip.x + 40 &&
        playerBullet.y > mysteryShip.y &&
        playerBullet.y < mysteryShip.y + 18
      ) {
        const bonus = 100 + Math.floor(Math.random() * 3) * 50;
        score += bonus;
        sound.mystery();
        shake.trigger(4, 0.2);
        particles.burst(mysteryShip.x + 20, mysteryShip.y + 9, { color: "#ff4d9e", count: 26, speed: 200, life: 0.6 });
        mysteryShip.active = false;
        playerBullet = null;
      }
    }

    invaderBullets = invaderBullets.filter((b) => {
      b.y += b.vy * dt;
      if (b.y > LOGICAL_H + 10) return false;
      if (hitShield(b.x, b.y)) {
        particles.burst(b.x, b.y, { color: "#ff8a3d", count: 6, speed: 90, life: 0.25 });
        return false;
      }
      if (
        player.invuln <= 0 &&
        b.x > player.x &&
        b.x < player.x + PLAYER_W &&
        b.y > player.y &&
        b.y < player.y + PLAYER_H
      ) {
        loseLife();
        return false;
      }
      return true;
    });
  }

  function loseLife() {
    sound.hit();
    shake.trigger(8, 0.35);
    particles.burst(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, { color: "#7dc4ff", count: 24, speed: 200, life: 0.6 });
    lives -= 1;
    if (lives <= 0) {
      sound.lose();
      setState("gameover", { text: "OVERRUN", score, wave });
    } else {
      player.invuln = RESPAWN_INVULN;
    }
  }

  function maybeInvaderFire() {
    const cols = new Map();
    for (const inv of invaders) {
      if (!inv.alive) continue;
      const existing = cols.get(inv.col);
      if (!existing || inv.y > existing.y) cols.set(inv.col, inv);
    }
    const frontline = [...cols.values()];
    if (!frontline.length) return;
    const fireChance = 0.1 + wave * 0.015;
    if (Math.random() < fireChance) {
      const shooter = frontline[Math.floor(Math.random() * frontline.length)];
      invaderBullets.push({ x: shooter.x + INVADER_W / 2, y: shooter.y + INVADER_H, vy: INVADER_BULLET_SPEED });
      sound.invaderShoot();
    }
  }

  function updateInvaders(dt) {
    const alive = invaders.filter((i) => i.alive);
    if (alive.length === 0) {
      sound.wave();
      startWave(wave + 1);
      return;
    }

    stepTimer += dt;
    const currentInterval = Math.max(0.06, stepInterval * (alive.length / (ROWS * COLS)) + 0.05);
    if (stepTimer < currentInterval) return;
    stepTimer = 0;

    const minX = Math.min(...alive.map((i) => i.x));
    const maxX = Math.max(...alive.map((i) => i.x + INVADER_W));
    const STEP_X = 12;
    let hitEdge = false;
    if (direction > 0 && maxX + STEP_X > LOGICAL_W - 10) hitEdge = true;
    if (direction < 0 && minX - STEP_X < 10) hitEdge = true;

    if (hitEdge) {
      direction *= -1;
      for (const inv of invaders) if (inv.alive) inv.y += 20;
      const lowest = Math.max(...invaders.filter((i) => i.alive).map((i) => i.y + INVADER_H));
      if (lowest >= player.y) {
        sound.lose();
        setState("gameover", { text: "INVADED", score, wave });
        return;
      }
    } else {
      for (const inv of invaders) if (inv.alive) inv.x += STEP_X * direction;
    }
    maybeInvaderFire();
  }

  function updateMysteryShip(dt) {
    if (mysteryShip && mysteryShip.active) {
      mysteryShip.x += mysteryShip.vx * dt;
      if (mysteryShip.x < -50 || mysteryShip.x > LOGICAL_W + 50) mysteryShip.active = false;
      return;
    }
    mysteryTimer -= dt;
    if (mysteryTimer <= 0) {
      const fromLeft = Math.random() < 0.5;
      mysteryShip = {
        active: true,
        x: fromLeft ? -40 : LOGICAL_W + 40,
        y: 36,
        vx: fromLeft ? 130 : -130,
      };
      mysteryTimer = 14 + Math.random() * 10;
    }
  }

  function drawShield(shield) {
    ctx.fillStyle = "#5ee6a0";
    for (let row = 0; row < SHIELD_ROWS; row++) {
      for (let col = 0; col < SHIELD_COLS; col++) {
        if (shield.blocks[row * SHIELD_COLS + col]) {
          ctx.fillRect(shield.x + col * SHIELD_BLOCK, shield.y + row * SHIELD_BLOCK, SHIELD_BLOCK - 1, SHIELD_BLOCK - 1);
        }
      }
    }
  }

  function drawInvader(inv) {
    ctx.fillStyle = ROW_COLORS[inv.row];
    ctx.shadowColor = ROW_COLORS[inv.row];
    ctx.shadowBlur = 4;
    const w = INVADER_W;
    const h = INVADER_H;
    ctx.fillRect(inv.x + w * 0.2, inv.y, w * 0.6, h * 0.35);
    ctx.fillRect(inv.x, inv.y + h * 0.35, w, h * 0.4);
    ctx.fillRect(inv.x + w * 0.1, inv.y + h * 0.75, w * 0.22, h * 0.25);
    ctx.fillRect(inv.x + w * 0.68, inv.y + h * 0.75, w * 0.22, h * 0.25);
    ctx.shadowBlur = 0;
  }

  function draw() {
    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);

    ctx.fillStyle = "#0d0704";
    ctx.fillRect(-10, -10, LOGICAL_W + 20, LOGICAL_H + 20);

    if (state !== "title") {
      for (const shield of shields) drawShield(shield);
      for (const inv of invaders) if (inv.alive) drawInvader(inv);

      if (mysteryShip && mysteryShip.active) {
        ctx.fillStyle = "#ff4d9e";
        ctx.shadowColor = "#ff4d9e";
        ctx.shadowBlur = 8;
        ctx.fillRect(mysteryShip.x, mysteryShip.y, 40, 16);
        ctx.shadowBlur = 0;
      }

      const blink = player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = "#ffb74d";
        ctx.shadowColor = "#ffb74d";
        ctx.shadowBlur = 8;
        ctx.fillRect(player.x + PLAYER_W * 0.4, player.y, PLAYER_W * 0.2, PLAYER_H * 0.5);
        ctx.fillRect(player.x, player.y + PLAYER_H * 0.5, PLAYER_W, PLAYER_H * 0.5);
        ctx.shadowBlur = 0;
      }

      if (playerBullet) {
        ctx.fillStyle = "#fff3d6";
        ctx.fillRect(playerBullet.x - 2, playerBullet.y - 8, 4, 12);
      }
      ctx.fillStyle = "#ff8a3d";
      for (const b of invaderBullets) {
        ctx.fillRect(b.x - 2, b.y - 6, 4, 10);
      }
    }

    particles.draw(ctx);

    ctx.font = "20px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 235, 200, 0.9)";
    ctx.fillText(`Score ${score}`, 14, 28);
    ctx.textAlign = "right";
    ctx.fillText(`${"▲".repeat(Math.max(0, lives))}`, LOGICAL_W - 14, 28);
    ctx.textAlign = "center";
    if (waveAnnounce > 0) {
      ctx.font = "bold 26px 'Courier New', monospace";
      ctx.fillStyle = `rgba(255, 183, 77, ${Math.min(1, waveAnnounce)})`;
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

    if (waveAnnounce > 0) waveAnnounce -= dt;

    if (state === "playing") {
      updatePlayer(dt);
      updateBullets(dt);
      updateInvaders(dt);
      updateMysteryShip(dt);
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
    window.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("pointerdown", onCanvasClickForStart);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchDrag);
    canvas.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart, destroy };
}
