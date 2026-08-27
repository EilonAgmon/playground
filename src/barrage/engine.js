import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// A from-scratch run-and-gun homage (Contra-shaped, original content) — same
// architecture as the other canvas games: logical coordinate space + DPR
// scaling, requestAnimationFrame loop, onState callback for React overlays.
// The one new wrinkle versus Salvo/Volfied is a scrolling camera + simple
// one-way-platform physics, since this is the first side-scrolling game
// in the set.
export function createBarrageEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const LOGICAL_W = 960;
  const LOGICAL_H = 540;
  const ASPECT = LOGICAL_W / LOGICAL_H;
  const GROUND_Y = 460;
  const WORLD_WIDTH = 3840;

  const MOVE_SPEED = 220;
  const GRAVITY = 1900;
  const JUMP_VELOCITY = -640;
  const PLAYER_W = 22;
  const PLAYER_H_STAND = 40;
  const PLAYER_H_DUCK = 24;
  const BULLET_SPEED = 620;
  // 4, not the genre-classic 3 — this is a single, fairly dense level
  // (pits, several enemy types, a boss) with no continues, so the extra
  // life buys real margin without trivializing it.
  const START_LIVES = 4;
  const INVULN_TIME = 1.6;
  const FIRE_COOLDOWN = { default: 0.22, spread: 0.32, rapid: 0.11 };
  const WEAPON_COLOR = { default: "#bfe8ff", spread: "#ffd166", rapid: "#7dffb3" };

  // One-way platforms: land only when falling onto them. Ground is
  // continuous except for two pits that force a jump.
  const GROUND_SEGMENTS = [
    { x1: 0, x2: 900 },
    { x1: 1020, x2: 2400 },
    { x1: 2520, x2: 3840 },
  ];
  const PLATFORMS = [
    { x1: 1550, x2: 1850, y: GROUND_Y - 110 },
    { x1: 2850, x2: 3100, y: GROUND_Y - 110 },
  ];
  // A checkpoint just before the boss trigger means a death mid-fight
  // respawns you back into the fight almost immediately instead of forcing
  // a long, stakes-free run back from 2700 (boss bullets get culled off-
  // camera during that run anyway, so it was pure tedium, not challenge).
  const CHECKPOINTS = [40, 1300, 2700, 3300];

  const ENEMY_SPAWNS = [
    { type: "grunt", x: 520 },
    { type: "turret", x: 860 },
    { type: "grunt", x: 1220 },
    { type: "flyer", x: 1480, y: 200 },
    { type: "grunt", x: 1700, groundY: GROUND_Y - 110 },
    { type: "turret", x: 2050 },
    { type: "grunt", x: 2260 },
    { type: "flyer", x: 2600, y: 250 },
    { type: "turret", x: 2950, groundY: GROUND_Y - 110 },
    { type: "grunt", x: 3150 },
    { type: "grunt", x: 3340 },
  ];
  const PICKUP_SPAWNS = [
    { type: "spread", x: 1650, y: GROUND_Y - 150 },
    { type: "rapid", x: 2950, y: GROUND_Y - 150 },
  ];
  const BOSS_TRIGGER_X = 3400;
  const BOSS_X = 3750;
  // Must line up with standing horizontal fire (~y=434, see gunPosition())
  // or the boss is only hittable via aim-up shots, which nothing teaches
  // the player to expect — found via an automated boss-fight playthrough
  // that survived via dodging but never once damaged the boss, at any
  // baseY the old value (260) put the boss's hitbox entirely above where
  // standard fire travels.
  const BOSS_BASE_Y = 405;
  // Tuned down from 30 after an isolated playthrough landed 19 real hits
  // (confirming the height fix works) but still ran out of lives around
  // hp=11 against a deliberately unskilled dodge pattern — 20 gives a human
  // player, who can actually see and time dodges around incoming shots,
  // comfortable room to win without the fight overstaying its welcome.
  const BOSS_MAX_HP = 20;

  const particles = createParticleSystem();
  const shake = createScreenShake();

  let scale = 1;
  let phase = "title";
  let lives = START_LIVES;

  let player, playerBullets, enemyBullets, enemies, pickups, boss, camera, input, keys;

  function freshWorld() {
    player = {
      x: 60,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: true,
      ducking: false,
      weapon: "default",
      fireCooldown: 0,
      invuln: 0,
      furthestX: 60,
    };
    playerBullets = [];
    enemyBullets = [];
    enemies = ENEMY_SPAWNS.map((s) => ({
      type: s.type,
      x: s.x,
      y: s.type === "flyer" ? s.y : (s.groundY ?? GROUND_Y),
      baseY: s.y,
      groundY: s.groundY ?? GROUND_Y,
      vx: 0,
      hp: 1,
      alive: true,
      fireTimer: 0.6 + Math.random() * 0.8,
      phaseT: Math.random() * Math.PI * 2,
    }));
    pickups = PICKUP_SPAWNS.map((p) => ({ ...p, collected: false }));
    boss = { spawned: false, active: false, hp: BOSS_MAX_HP, maxHp: BOSS_MAX_HP, x: BOSS_X, y: BOSS_BASE_Y, baseY: BOSS_BASE_Y, bobPhase: 0, cycleTimer: 1.6, nextPattern: "spread" };
    camera = { x: 0 };
    input = { moveDir: 0, aimUp: false, duck: false, fireHeld: false };
    keys = { left: false, right: false, up: false, down: false, fire: false };
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

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function aabbOverlap(a, b) {
    return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
  }

  function playerHitbox() {
    const h = player.ducking ? PLAYER_H_DUCK : PLAYER_H_STAND;
    return { x1: player.x - PLAYER_W / 2, x2: player.x + PLAYER_W / 2, y1: player.y - h, y2: player.y };
  }

  // Turret hitbox is deliberately as tall as the grunt's despite looking
  // squat/embedded — standing-height fire has to actually connect with it,
  // or it's only killable by ducking first, which nothing teaches the
  // player to expect (found via an automated playthrough dying to it
  // repeatedly: standing fire at ~y-26 from the player's feet never
  // overlapped a literal 20px-tall hitbox flush with the ground).
  const ENEMY_SIZE = { grunt: { w: 20, h: 32 }, turret: { w: 26, h: 32 }, flyer: { w: 24, h: 18 } };
  function enemyHitbox(e) {
    const size = ENEMY_SIZE[e.type];
    return { x1: e.x - size.w / 2, x2: e.x + size.w / 2, y1: e.y - size.h, y2: e.y };
  }
  function bossHitbox() {
    return { x1: boss.x - 35, x2: boss.x + 35, y1: boss.y - 35, y2: boss.y + 35 };
  }
  function bulletHitbox(b) {
    return { x1: b.x - 4, x2: b.x + 4, y1: b.y - 4, y2: b.y + 4 };
  }
  function pickupHitbox(p) {
    return { x1: p.x - 14, x2: p.x + 14, y1: p.y - 14, y2: p.y + 14 };
  }

  // ---------- input ----------

  function recomputeMove() {
    input.moveDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  }
  function setKey(name, val) {
    keys[name] = val;
    if (name === "left" || name === "right") recomputeMove();
    if (name === "up") input.aimUp = val;
    if (name === "down") input.duck = val;
    if (name === "fire") input.fireHeld = val;
  }
  function pressJump() {
    if (phase !== "playing") return;
    if (player.grounded) {
      ensureAudio();
      player.vy = JUMP_VELOCITY;
      player.grounded = false;
      beep(420, 0.09, "square", 0.08);
    }
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setKey("left", true);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setKey("right", true);
    else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") setKey("up", true);
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") setKey("down", true);
    else if (e.key === "z" || e.key === "Z" || e.key === "x" || e.key === "X") {
      ensureAudio();
      setKey("fire", true);
    } else if (e.key === " ") {
      e.preventDefault();
      if (phase === "title" || phase === "gameover" || phase === "win") startOrRestart();
      else pressJump();
    }
  }
  function onKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setKey("left", false);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setKey("right", false);
    else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") setKey("up", false);
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") setKey("down", false);
    else if (e.key === "z" || e.key === "Z" || e.key === "x" || e.key === "X") setKey("fire", false);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function onCanvasPointerDown() {
    if (phase === "title" || phase === "gameover" || phase === "win") {
      startOrRestart();
      return;
    }
    // Clicking/tapping the game itself is a completely natural thing to
    // try for "fire" — Z/X worked but nothing on the canvas itself did,
    // which reads as "shooting doesn't work" if that's what a player
    // reaches for first.
    ensureAudio();
    setKey("fire", true);
  }
  function onCanvasPointerUp() {
    setKey("fire", false);
  }
  canvas.addEventListener("pointerdown", onCanvasPointerDown);
  canvas.addEventListener("pointerup", onCanvasPointerUp);
  canvas.addEventListener("pointerleave", onCanvasPointerUp);

  function startOrRestart() {
    ensureAudio();
    lives = START_LIVES;
    freshWorld();
    setState("playing", { lives, weapon: "default" });
  }

  // ---------- world queries ----------

  function surfacesAt(x) {
    const ys = [];
    for (const p of PLATFORMS) if (x >= p.x1 && x <= p.x2) ys.push(p.y);
    for (const g of GROUND_SEGMENTS) if (x >= g.x1 && x <= g.x2) ys.push(GROUND_Y);
    return ys;
  }

  function gunPosition() {
    const h = player.ducking ? PLAYER_H_DUCK : PLAYER_H_STAND;
    const top = player.y - h;
    if (input.aimUp && player.grounded && !player.ducking) return { x: player.x, y: top - 18 };
    const midY = player.ducking ? player.y - h * 0.55 : top + h * 0.35;
    return { x: player.x + player.facing * (PLAYER_W / 2 + 10), y: midY };
  }

  function fireWeapon() {
    let baseDir;
    if (input.aimUp && player.grounded && !player.ducking) baseDir = { dx: 0, dy: -1 };
    else if (input.aimUp && !player.grounded) baseDir = { dx: player.facing * 0.72, dy: -0.72 };
    else baseDir = { dx: player.facing, dy: 0 };

    let dirs = [baseDir];
    if (player.weapon === "spread") {
      const baseAngle = Math.atan2(baseDir.dy, baseDir.dx);
      dirs = [-0.3, 0, 0.3].map((off) => {
        const a = baseAngle + off;
        return { dx: Math.cos(a), dy: Math.sin(a) };
      });
    }

    const gun = gunPosition();
    for (const d of dirs) {
      const len = Math.hypot(d.dx, d.dy) || 1;
      playerBullets.push({ x: gun.x, y: gun.y, vx: (d.dx / len) * BULLET_SPEED, vy: (d.dy / len) * BULLET_SPEED, color: WEAPON_COLOR[player.weapon] });
    }
    particles.burst(gun.x, gun.y, { color: "#e8f6ff", count: 3, speed: 40, life: 0.15, size: 2 });
    beep(player.weapon === "rapid" ? 880 : player.weapon === "spread" ? 520 : 660, 0.04, "square", 0.06);
  }

  function respawnPlayer() {
    const cp = [...CHECKPOINTS].reverse().find((x) => x <= player.furthestX) ?? CHECKPOINTS[0];
    player.x = cp;
    player.y = GROUND_Y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.weapon = "default";
    player.invuln = INVULN_TIME;
    player.facing = 1;
    camera.x = clamp(player.x - LOGICAL_W / 2, 0, WORLD_WIDTH - LOGICAL_W);
  }

  function hurtPlayer() {
    if (player.invuln > 0) return;
    shake.trigger(10, 0.35);
    particles.burst(player.x, player.y - 20, { color: "#5ec6e0", count: 18, speed: 160, life: 0.5 });
    beep(140, 0.22, "sawtooth", 0.14);
    lives -= 1;
    if (lives <= 0) {
      setState("gameover", { lives: 0 });
    } else {
      respawnPlayer();
      onState("playing", hudSnapshot());
    }
  }

  function hudSnapshot() {
    return { lives, weapon: player.weapon, bossActive: boss.active, bossHp: boss.hp, bossMaxHp: boss.maxHp };
  }

  // ---------- update ----------

  function updatePlayer(dt) {
    if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);

    player.ducking = input.duck && player.grounded;
    player.vx = player.ducking ? 0 : input.moveDir * MOVE_SPEED;
    if (input.moveDir !== 0) player.facing = input.moveDir;

    player.vy += GRAVITY * dt;
    const prevFeetY = player.y;
    let nx = clamp(player.x + player.vx * dt, PLAYER_W / 2, WORLD_WIDTH - PLAYER_W / 2);
    let ny = player.y + player.vy * dt;

    if (player.vy >= 0) {
      const surfaces = surfacesAt(nx);
      let landOn = null;
      for (const sy of surfaces) {
        if (prevFeetY <= sy + 0.01 && ny >= sy) {
          if (landOn === null || sy < landOn) landOn = sy;
        }
      }
      if (landOn !== null) {
        ny = landOn;
        player.vy = 0;
        player.grounded = true;
      } else {
        player.grounded = false;
      }
    } else {
      player.grounded = false;
    }

    player.x = nx;
    player.y = ny;
    player.furthestX = Math.max(player.furthestX, player.x);

    if (player.y > LOGICAL_H + 80) {
      hurtPlayer();
      return;
    }

    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    if (input.fireHeld && player.fireCooldown <= 0) {
      fireWeapon();
      player.fireCooldown = FIRE_COOLDOWN[player.weapon];
    }

    for (const pk of pickups) {
      if (!pk.collected && aabbOverlap(playerHitbox(), pickupHitbox(pk))) {
        pk.collected = true;
        player.weapon = pk.type;
        beep(1040, 0.12, "triangle", 0.14);
        onState("playing", hudSnapshot());
      }
    }
  }

  function spawnEnemyBullet(x, y, vx, vy) {
    enemyBullets.push({ x, y, vx, vy });
  }

  function updateGrunt(e, dt) {
    const dx = player.x - e.x;
    // Stops (and starts shooting) well before contact range — a player
    // advancing steadily should be able to drop a grunt with fire before it
    // ever closes to contact distance, rather than the two of them meeting
    // in the middle almost immediately.
    if (Math.abs(dx) > 340) {
      e.vx = Math.sign(dx) * 45;
    } else {
      e.vx = 0;
      // fireTimer only ticks once actually in range — otherwise it can run
      // out entirely during the approach walk, so the "first shot" delay
      // does nothing and it fires the instant it's in range instead of
      // after a genuine pause.
      e.fireTimer = Math.max(0, e.fireTimer - dt);
      if (e.fireTimer <= 0) {
        spawnEnemyBullet(e.x, e.y - 20, Math.sign(dx || 1) * BULLET_SPEED * 0.55, 0);
        e.fireTimer = 1.3;
      }
    }
    e.x += e.vx * dt;
  }

  function updateTurret(e, dt) {
    const dx = player.x - e.x;
    if (Math.abs(dx) >= 520) return;
    e.fireTimer = Math.max(0, e.fireTimer - dt);
    if (e.fireTimer <= 0) {
      spawnEnemyBullet(e.x, e.y - 14, Math.sign(dx || 1) * BULLET_SPEED * 0.6, 0);
      e.fireTimer = 1.5;
    }
  }

  function updateFlyer(e, dt) {
    e.phaseT += dt;
    e.x -= 15 * dt;
    e.y = e.baseY + Math.sin(e.phaseT * 2) * 40;
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === "grunt") updateGrunt(e, dt);
      else if (e.type === "turret") updateTurret(e, dt);
      else if (e.type === "flyer") updateFlyer(e, dt);
    }
  }

  function fireBossSpread() {
    const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
    for (let i = -2; i <= 2; i++) {
      const a = baseAngle + i * 0.22;
      spawnEnemyBullet(boss.x, boss.y, Math.cos(a) * BULLET_SPEED * 0.55, Math.sin(a) * BULLET_SPEED * 0.55);
    }
    shake.trigger(3, 0.15);
    beep(200, 0.2, "sawtooth", 0.12);
  }
  function fireBossFocused() {
    const a = Math.atan2(player.y - boss.y, player.x - boss.x);
    spawnEnemyBullet(boss.x, boss.y, Math.cos(a) * BULLET_SPEED * 0.95, Math.sin(a) * BULLET_SPEED * 0.95);
    beep(260, 0.15, "sawtooth", 0.14);
  }

  function updateBoss(dt) {
    if (!boss.active) return;
    boss.bobPhase += dt;
    boss.y = boss.baseY + Math.sin(boss.bobPhase) * 14;
    boss.cycleTimer -= dt;
    if (boss.cycleTimer <= 0) {
      if (boss.nextPattern === "spread") fireBossSpread();
      else fireBossFocused();
      boss.nextPattern = boss.nextPattern === "spread" ? "focused" : "spread";
      boss.cycleTimer = 2.0;
    }
  }

  function checkBossTrigger() {
    if (!boss.spawned && player.furthestX > BOSS_TRIGGER_X) {
      boss.spawned = true;
      boss.active = true;
      onState("playing", hudSnapshot());
    }
  }

  function withinCull(b) {
    return b.x > camera.x - 80 && b.x < camera.x + LOGICAL_W + 80 && b.y > -80 && b.y < LOGICAL_H + 80;
  }

  function updateBullets(dt) {
    for (const b of playerBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    for (const b of enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    for (const b of playerBullets) {
      if (b.dead) continue;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (aabbOverlap(bulletHitbox(b), enemyHitbox(e))) {
          e.hp -= 1;
          b.dead = true;
          particles.burst(e.x, e.y - 10, { color: "#ff8a6b", count: 12, speed: 140, life: 0.35 });
          if (e.hp <= 0) {
            e.alive = false;
            beep(240, 0.1, "square", 0.1);
          }
          break;
        }
      }
      if (!b.dead && boss.active && aabbOverlap(bulletHitbox(b), bossHitbox())) {
        boss.hp -= 1;
        b.dead = true;
        particles.burst(boss.x, boss.y, { color: "#e0aaff", count: 8, speed: 110, life: 0.3 });
        onState("playing", hudSnapshot());
        if (boss.hp <= 0) {
          boss.active = false;
          shake.trigger(16, 0.6);
          particles.burst(boss.x, boss.y, { color: "#ffd166", count: 60, speed: 240, life: 1 });
          beep(90, 0.6, "sawtooth", 0.18);
          setState("win", { lives });
        }
      }
    }

    playerBullets = playerBullets.filter((b) => !b.dead && withinCull(b));
    enemyBullets = enemyBullets.filter((b) => withinCull(b));

    if (phase === "playing" && player.invuln <= 0) {
      for (const e of enemies) {
        if (e.alive && aabbOverlap(playerHitbox(), enemyHitbox(e))) {
          hurtPlayer();
          break;
        }
      }
    }
    if (player.invuln <= 0 && phase === "playing") {
      for (const b of enemyBullets) {
        if (aabbOverlap(playerHitbox(), bulletHitbox(b))) {
          b.dead = true;
          hurtPlayer();
          break;
        }
      }
      enemyBullets = enemyBullets.filter((b) => !b.dead);
    }
    if (player.invuln <= 0 && phase === "playing" && boss.active && aabbOverlap(playerHitbox(), bossHitbox())) {
      hurtPlayer();
    }
  }

  function updateCamera() {
    camera.x = clamp(player.x - LOGICAL_W / 2, 0, WORLD_WIDTH - LOGICAL_W);
  }

  function update(dt) {
    if (phase !== "playing") return;
    updatePlayer(dt);
    if (phase !== "playing") return; // hurtPlayer() may have ended the game
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    if (phase !== "playing") return;
    checkBossTrigger();
    updateCamera();
    onState("playing", hudSnapshot());
  }

  // ---------- render ----------

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
    grad.addColorStop(0, "#0e2418");
    grad.addColorStop(1, "#1c3524");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    ctx.save();
    ctx.translate(-camera.x * 0.3, 0);
    ctx.fillStyle = "#16301f";
    for (let i = 0; i < 24; i++) {
      const x = i * 220;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x + 90, GROUND_Y - 120 - ((i % 3) * 30));
      ctx.lineTo(x + 180, GROUND_Y);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-camera.x * 0.6, 0);
    ctx.fillStyle = "#204028";
    for (let i = 0; i < 28; i++) {
      const x = i * 160;
      ctx.fillRect(x, GROUND_Y - 70, 26, 70);
    }
    ctx.restore();
  }

  function drawGround() {
    ctx.fillStyle = "#3a2c1c";
    for (const g of GROUND_SEGMENTS) {
      ctx.fillRect(g.x1, GROUND_Y, g.x2 - g.x1, LOGICAL_H - GROUND_Y + 40);
      ctx.fillStyle = "#4a3823";
      ctx.fillRect(g.x1, GROUND_Y, g.x2 - g.x1, 6);
      ctx.fillStyle = "#3a2c1c";
    }
    for (const p of PLATFORMS) {
      ctx.fillStyle = "#5a4530";
      ctx.fillRect(p.x1, p.y, p.x2 - p.x1, 12);
      ctx.fillStyle = "#6b5238";
      ctx.fillRect(p.x1, p.y, p.x2 - p.x1, 4);
    }
  }

  function drawPickups() {
    for (const p of pickups) {
      if (p.collected) continue;
      const bob = Math.sin(performance.now() / 260 + p.x) * 4;
      ctx.fillStyle = WEAPON_COLOR[p.type];
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
    }
  }

  function drawEnemies() {
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === "grunt") {
        ctx.fillStyle = "#c25b4a";
        ctx.fillRect(e.x - 10, e.y - 32, 20, 32);
        ctx.fillStyle = "#e0b088";
        ctx.fillRect(e.x - 6, e.y - 40, 12, 10);
      } else if (e.type === "turret") {
        ctx.fillStyle = "#4a3d48";
        ctx.fillRect(e.x - 13, e.y - 16, 26, 16);
        ctx.fillStyle = "#6b5560";
        ctx.fillRect(e.x - 9, e.y - 32, 18, 18);
        ctx.fillStyle = "#8a6a78";
        const dir = Math.sign(player.x - e.x) || 1;
        ctx.fillRect(e.x + dir * 4, e.y - 26, dir * 16, 5);
      } else if (e.type === "flyer") {
        ctx.fillStyle = "#8a5cd6";
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawBoss() {
    if (!boss.spawned) return;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.fillStyle = boss.active ? "#7a3a8a" : "#4a2a54";
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0aaff";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBullets() {
    for (const b of playerBullets) {
      ctx.fillStyle = b.color || "#bfe8ff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ff6b5e";
    for (const b of enemyBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer() {
    if (player.invuln > 0 && Math.floor(player.invuln * 14) % 2 === 0) return;
    const h = player.ducking ? PLAYER_H_DUCK : PLAYER_H_STAND;
    const top = player.y - h;
    ctx.save();
    ctx.translate(player.x, 0);
    ctx.scale(player.facing, 1);

    ctx.fillStyle = "#3fb0c9";
    ctx.fillRect(-PLAYER_W / 2, top, PLAYER_W, h);
    ctx.fillStyle = "#e0b088";
    ctx.fillRect(-8, top - 10, 16, 12);

    ctx.fillStyle = "#2a2a30";
    if (input.aimUp && player.grounded && !player.ducking) {
      ctx.fillRect(-3, top - 22, 6, 18);
    } else {
      const gunY = player.ducking ? top + h * 0.4 : top + h * 0.32;
      ctx.fillRect(PLAYER_W / 2 - 2, gunY, 15, 5);
    }
    ctx.restore();
  }

  function drawHud() {
    ctx.fillStyle = "rgba(230, 245, 250, 0.92)";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`x${Math.max(0, lives)}`, 16, 26);

    ctx.textAlign = "right";
    ctx.fillStyle = WEAPON_COLOR[player.weapon];
    const label = player.weapon === "default" ? "SINGLE" : player.weapon.toUpperCase();
    ctx.fillText(label, LOGICAL_W - 16, 26);

    if (boss.spawned && (boss.active || boss.hp <= 0)) {
      const barW = 300;
      const x0 = LOGICAL_W / 2 - barW / 2;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(x0, 14, barW, 10);
      ctx.fillStyle = "#e0aaff";
      ctx.fillRect(x0, 14, barW * Math.max(0, boss.hp / boss.maxHp), 10);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.strokeRect(x0, 14, barW, 10);
    }
  }

  function render() {
    const off = shake.offset();
    drawBackground();
    ctx.save();
    ctx.translate(off.x - camera.x, off.y);
    drawGround();
    drawPickups();
    drawEnemies();
    drawBoss();
    drawBullets();
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
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("pointerdown", onCanvasPointerDown);
    canvas.removeEventListener("pointerup", onCanvasPointerUp);
    canvas.removeEventListener("pointerleave", onCanvasPointerUp);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart, destroy, setKey, pressJump };
}
