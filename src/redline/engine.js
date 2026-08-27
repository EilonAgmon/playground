import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// A from-scratch top-down highway-combat homage (Spy Hunter-shaped, original
// content). Same architecture as the other canvas games (logical coordinate
// space + DPR scaling, RAF loop, onState callback), but structurally
// simpler than Barrage: the player's screen position is fixed and the
// world scrolls past at a distance-driven rate, rather than a camera
// following the player through a wide world.
export function createRedlineEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const LOGICAL_W = 480;
  const LOGICAL_H = 800;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const ROAD_LEFT = 50;
  const ROAD_RIGHT = 430;
  const PLAYER_Y = 660;
  const PLAYER_W = 30;
  const PLAYER_H = 50;
  const MOVE_SPEED = 280;
  const BASE_SCROLL_SPEED = 230;
  const BULLET_SPEED = 640;
  const START_LIVES = 4;
  const INVULN_TIME = 1.5;
  const FIRE_COOLDOWN = { default: 0.24, missile: 0.4 };
  const BULLET_DAMAGE = { default: 1, missile: 2 };
  const WEAPON_COLOR = { default: "#bfe8ff", missile: "#ffb35c" };
  const OIL_COOLDOWN = 3.2;
  const DISTANCE_GOAL = 6000;

  const particles = createParticleSystem();
  const shake = createScreenShake();

  let scale = 1;
  let phase = "title";
  let lives = START_LIVES;
  let distance = 0;
  let elapsed = 0;

  let player, playerBullets, enemyBullets, cars, oilSlicks, pickups, input, keys, oilCooldown, spawnTimer;

  function freshWorld() {
    player = { x: LOGICAL_W / 2, weapon: "default", fireCooldown: 0, invuln: 0 };
    playerBullets = [];
    enemyBullets = [];
    cars = [];
    oilSlicks = [];
    pickups = [];
    input = { moveDir: 0, fireHeld: false };
    keys = { left: false, right: false, fire: false };
    oilCooldown = 0;
    spawnTimer = 0.6;
    distance = 0;
    elapsed = 0;
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
    return { x1: player.x - PLAYER_W / 2, x2: player.x + PLAYER_W / 2, y1: PLAYER_Y - PLAYER_H, y2: PLAYER_Y };
  }
  const CAR_W = 28;
  const CAR_H = 46;
  function carHitbox(c) {
    return { x1: c.x - CAR_W / 2, x2: c.x + CAR_W / 2, y1: c.y - CAR_H, y2: c.y };
  }
  function bulletHitbox(b) {
    return { x1: b.x - 4, x2: b.x + 4, y1: b.y - 4, y2: b.y + 4 };
  }
  function oilHitbox(o) {
    return { x1: o.x - 20, x2: o.x + 20, y1: o.y - 14, y2: o.y + 14 };
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
    if (name === "fire") input.fireHeld = val;
  }
  function deployOil() {
    if (phase !== "playing" || oilCooldown > 0) return;
    ensureAudio();
    oilSlicks.push({ x: player.x, y: PLAYER_Y + 30, life: 5 });
    oilCooldown = OIL_COOLDOWN;
    beep(180, 0.18, "sawtooth", 0.1);
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setKey("left", true);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setKey("right", true);
    else if (e.key === "z" || e.key === "Z" || e.key === "x" || e.key === "X") {
      ensureAudio();
      setKey("fire", true);
    } else if (e.key === " " || e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      e.preventDefault();
      if (phase === "title" || phase === "gameover" || phase === "win") startOrRestart();
      else deployOil();
    }
  }
  function onKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setKey("left", false);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setKey("right", false);
    else if (e.key === "z" || e.key === "Z" || e.key === "x" || e.key === "X") setKey("fire", false);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function onCanvasPointerDown() {
    if (phase === "title" || phase === "gameover" || phase === "win") startOrRestart();
  }
  canvas.addEventListener("pointerdown", onCanvasPointerDown);

  function startOrRestart() {
    ensureAudio();
    lives = START_LIVES;
    freshWorld();
    setState("playing", { lives, weapon: "default" });
  }

  function hudSnapshot() {
    return { lives, weapon: player.weapon, distance: Math.floor(distance), goal: DISTANCE_GOAL, oilReady: oilCooldown <= 0 };
  }

  function hurtPlayer() {
    if (player.invuln > 0) return;
    shake.trigger(9, 0.3);
    particles.burst(player.x, PLAYER_Y - 20, { color: "#5ec6e0", count: 16, speed: 150, life: 0.45 });
    beep(140, 0.2, "sawtooth", 0.14);
    lives -= 1;
    if (lives <= 0) {
      setState("gameover", { lives: 0 });
    } else {
      player.invuln = INVULN_TIME;
      player.weapon = "default";
      onState("playing", hudSnapshot());
    }
  }

  function fireWeapon() {
    playerBullets.push({ x: player.x, y: PLAYER_Y - PLAYER_H, vy: -BULLET_SPEED, color: WEAPON_COLOR[player.weapon] });
    particles.burst(player.x, PLAYER_Y - PLAYER_H, { color: "#e8f6ff", count: 3, speed: 40, life: 0.15, size: 2 });
    beep(player.weapon === "missile" ? 520 : 660, 0.05, "square", 0.06);
  }

  const CAR_TYPES = {
    civilian: { speed: 90, hp: 1, color: "#d8cdb8", shoots: false },
    enforcer: { speed: 120, hp: 2, color: "#8a2f2f", shoots: false, weaves: true },
    gunner: { speed: 100, hp: 2, color: "#5a3a8a", shoots: true },
  };

  function spawnCar() {
    const r = Math.random();
    const type = r < 0.45 ? "civilian" : r < 0.75 ? "enforcer" : "gunner";
    const x = ROAD_LEFT + CAR_W + Math.random() * (ROAD_RIGHT - ROAD_LEFT - CAR_W * 2);
    cars.push({ type, x, y: -40, hp: CAR_TYPES[type].hp, fireTimer: 0.8 + Math.random(), weaveTimer: 1 + Math.random() });
  }

  function maybeSpawnPickup() {
    if (Math.random() < 0.15) {
      const x = ROAD_LEFT + 30 + Math.random() * (ROAD_RIGHT - ROAD_LEFT - 60);
      pickups.push({ x, y: -40 });
    }
  }

  // ---------- update ----------

  function updatePlayer(dt) {
    if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);
    player.x = clamp(player.x + input.moveDir * MOVE_SPEED * dt, ROAD_LEFT + PLAYER_W / 2, ROAD_RIGHT - PLAYER_W / 2);

    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    if (input.fireHeld && player.fireCooldown <= 0) {
      fireWeapon();
      player.fireCooldown = FIRE_COOLDOWN[player.weapon];
    }
    oilCooldown = Math.max(0, oilCooldown - dt);

    for (const p of pickups) {
      if (!p.collected && aabbOverlap(playerHitbox(), pickupHitbox(p))) {
        p.collected = true;
        player.weapon = "missile";
        beep(1040, 0.12, "triangle", 0.14);
        onState("playing", hudSnapshot());
      }
    }
    pickups = pickups.filter((p) => !p.collected);
  }

  function updateCars(dt) {
    for (const c of cars) {
      c.y += CAR_TYPES[c.type].speed * dt;
      if (CAR_TYPES[c.type].weaves) {
        c.weaveTimer -= dt;
        if (c.weaveTimer <= 0) {
          c.targetX = ROAD_LEFT + CAR_W + Math.random() * (ROAD_RIGHT - ROAD_LEFT - CAR_W * 2);
          c.weaveTimer = 1.4 + Math.random() * 1.2;
        }
        if (c.targetX != null) c.x += clamp(c.targetX - c.x, -60 * dt, 60 * dt);
      }
      if (CAR_TYPES[c.type].shoots) {
        c.fireTimer -= dt;
        if (c.fireTimer <= 0 && c.y > 0 && c.y < LOGICAL_H * 0.7) {
          enemyBullets.push({ x: c.x, y: c.y, vy: 320 });
          c.fireTimer = 1.6;
        }
      }
    }
  }

  function withinCull(o) {
    return o.y > -80 && o.y < LOGICAL_H + 80;
  }

  function updateBullets(dt) {
    for (const b of playerBullets) b.y += b.vy * dt;
    for (const b of enemyBullets) b.y += b.vy * dt;

    for (const b of playerBullets) {
      if (b.dead) continue;
      for (const c of cars) {
        if (c.dead) continue;
        if (aabbOverlap(bulletHitbox(b), carHitbox(c))) {
          c.hp -= BULLET_DAMAGE[player.weapon];
          b.dead = true;
          particles.burst(c.x, c.y - 20, { color: "#ff8a6b", count: 10, speed: 130, life: 0.3 });
          if (c.hp <= 0) {
            c.dead = true;
            beep(240, 0.1, "square", 0.1);
            particles.burst(c.x, c.y - 20, { color: CAR_TYPES[c.type].color, count: 16, speed: 160, life: 0.4 });
          }
          break;
        }
      }
    }
    cars = cars.filter((c) => !c.dead && c.y < LOGICAL_H + 60);
    playerBullets = playerBullets.filter((b) => !b.dead && withinCull(b));
    enemyBullets = enemyBullets.filter(withinCull);

    for (const o of oilSlicks) {
      o.life -= dt;
      for (const c of cars) {
        if (!c.dead && aabbOverlap(oilHitbox(o), carHitbox(c))) {
          c.dead = true;
          particles.burst(c.x, c.y - 20, { color: "#3a2a1a", count: 14, speed: 120, life: 0.4 });
          beep(160, 0.15, "sawtooth", 0.08);
        }
      }
    }
    oilSlicks = oilSlicks.filter((o) => o.life > 0);

    if (phase === "playing" && player.invuln <= 0) {
      for (const c of cars) {
        if (!c.dead && aabbOverlap(playerHitbox(), carHitbox(c))) {
          c.dead = true;
          hurtPlayer();
          break;
        }
      }
    }
    if (phase === "playing" && player.invuln <= 0) {
      for (const b of enemyBullets) {
        if (aabbOverlap(playerHitbox(), bulletHitbox(b))) {
          b.dead = true;
          hurtPlayer();
          break;
        }
      }
      enemyBullets = enemyBullets.filter((b) => !b.dead);
    }
  }

  function update(dt) {
    if (phase !== "playing") return;
    elapsed += dt;
    distance += BASE_SCROLL_SPEED * dt;

    updatePlayer(dt);
    if (phase !== "playing") return;
    updateCars(dt);
    updateBullets(dt);
    if (phase !== "playing") return;

    spawnTimer -= dt;
    const interval = Math.max(0.45, 1.3 - distance / 6000);
    if (spawnTimer <= 0) {
      spawnCar();
      maybeSpawnPickup();
      spawnTimer = interval;
    }

    if (distance >= DISTANCE_GOAL) {
      shake.trigger(6, 0.3);
      beep(700, 0.4, "triangle", 0.16);
      setState("win", { lives });
      return;
    }

    onState("playing", hudSnapshot());
  }

  // ---------- render ----------

  function drawRoad() {
    ctx.fillStyle = "#1c1f26";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.fillStyle = "#3a4048";
    ctx.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, LOGICAL_H);

    ctx.fillStyle = "#2a2f36";
    ctx.fillRect(ROAD_LEFT - 10, 0, 10, LOGICAL_H);
    ctx.fillRect(ROAD_RIGHT, 0, 10, LOGICAL_H);

    const laneX = LOGICAL_W / 2;
    ctx.fillStyle = "#e8d97a";
    const spacing = 60;
    const offset = distance % spacing;
    for (let y = -spacing + offset; y < LOGICAL_H; y += spacing) {
      ctx.fillRect(laneX - 3, y, 6, 30);
    }
  }

  function drawCars() {
    for (const c of cars) {
      const def = CAR_TYPES[c.type];
      ctx.fillStyle = def.color;
      ctx.fillRect(c.x - CAR_W / 2, c.y - CAR_H, CAR_W, CAR_H);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(c.x - CAR_W / 2 + 4, c.y - CAR_H + 8, CAR_W - 8, 14);
    }
  }

  function drawOil() {
    for (const o of oilSlicks) {
      ctx.globalAlpha = Math.min(1, o.life / 1.5);
      ctx.fillStyle = "#1a1108";
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, 22, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawPickups() {
    for (const p of pickups) {
      const bob = Math.sin(performance.now() / 250 + p.x) * 3;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = WEAPON_COLOR.missile;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
    }
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
    ctx.fillStyle = "#3fb0c9";
    ctx.fillRect(player.x - PLAYER_W / 2, PLAYER_Y - PLAYER_H, PLAYER_W, PLAYER_H);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(player.x - PLAYER_W / 2 + 4, PLAYER_Y - PLAYER_H + 8, PLAYER_W - 8, 16);
  }

  function drawHud() {
    ctx.fillStyle = "rgba(230, 245, 250, 0.92)";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`x${Math.max(0, lives)}`, 14, 26);

    ctx.textAlign = "right";
    ctx.fillStyle = WEAPON_COLOR[player.weapon];
    ctx.fillText(player.weapon.toUpperCase(), LOGICAL_W - 14, 26);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(230, 245, 250, 0.85)";
    ctx.font = "13px 'Courier New', monospace";
    const pct = Math.min(100, Math.floor((distance / DISTANCE_GOAL) * 100));
    ctx.fillText(`${pct}%`, LOGICAL_W / 2, 26);

    ctx.fillStyle = oilCooldown <= 0 ? "#7dffb3" : "rgba(230,245,250,0.4)";
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillText(oilCooldown <= 0 ? "OIL READY" : "OIL...", LOGICAL_W / 2, 44);
  }

  function render() {
    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);
    drawRoad();
    drawOil();
    drawPickups();
    drawCars();
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
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart, destroy, setKey, deployOil };
}
