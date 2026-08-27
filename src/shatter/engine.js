import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// An Asteroids-shaped homage (original content): momentum-based ship in a
// screen-wrapping arena, splitting rocks, an occasional saucer, endless
// escalating waves rather than a fixed end point — that's the genre's own
// answer to "why only one level," not a corner cut relative to the site's
// other games.
export function createShatterEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const LOGICAL_W = 900;
  const LOGICAL_H = 700;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const SHIP_RADIUS = 12;
  const ROTATE_SPEED = 3.6;
  const THRUST_ACCEL = 260;
  const MAX_SPEED = 340;
  const DRAG_PER_SEC = 0.4;
  const BULLET_SPEED = 480;
  const BULLET_LIFETIME = 0.9;
  const FIRE_COOLDOWN = 0.22;
  const INVULN_TIME = 2.2;
  const START_LIVES = 4;

  const SIZES = {
    large: { radius: 40, speed: 55, score: 20, vertices: 11 },
    medium: { radius: 23, speed: 85, score: 50, vertices: 9 },
    small: { radius: 12, speed: 125, score: 100, vertices: 8 },
  };
  const CHILD_SIZE = { large: "medium", medium: "small", small: null };

  const UFO_RADIUS = 16;
  const UFO_SPEED = 100;
  const UFO_BULLET_SPEED = 260;
  const UFO_FIRE_INTERVAL = 1.7;
  const UFO_SCORE = 300;

  const particles = createParticleSystem();
  const shake = createScreenShake();

  let scale = 1;
  let phase = "title";
  let lives = START_LIVES;
  let score = 0;
  let wave = 1;

  let ship, bullets, asteroids, ufo, ufoBullets, keys, ufoTimer;

  function randRange(a, b) {
    return a + Math.random() * (b - a);
  }

  function makeAsteroidShape(vertexCount) {
    const offsets = [];
    for (let i = 0; i < vertexCount; i++) offsets.push(randRange(0.75, 1.15));
    return offsets;
  }

  function spawnAsteroid(size, x, y, parentVx = 0, parentVy = 0) {
    const def = SIZES[size];
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(def.speed * 0.6, def.speed * 1.3);
    asteroids.push({
      x,
      y,
      vx: parentVx * 0.3 + Math.cos(angle) * speed,
      vy: parentVy * 0.3 + Math.sin(angle) * speed,
      size,
      radius: def.radius,
      shape: makeAsteroidShape(def.vertices),
      rotation: Math.random() * Math.PI * 2,
      spin: randRange(-1.2, 1.2),
    });
  }

  function edgeSpawnPoint() {
    // Spawn on the arena border, never near the ship's fixed respawn point
    // at the center — guarantees a wave never opens with an instant hit.
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: randRange(0, LOGICAL_W), y: 0 };
    if (side === 1) return { x: LOGICAL_W, y: randRange(0, LOGICAL_H) };
    if (side === 2) return { x: randRange(0, LOGICAL_W), y: LOGICAL_H };
    return { x: 0, y: randRange(0, LOGICAL_H) };
  }

  function startWave(n) {
    const count = Math.min(3 + n, 10);
    for (let i = 0; i < count; i++) {
      const { x, y } = edgeSpawnPoint();
      spawnAsteroid("large", x, y);
    }
  }

  function freshWorld() {
    ship = { x: LOGICAL_W / 2, y: LOGICAL_H / 2, vx: 0, vy: 0, angle: 0, invuln: INVULN_TIME, thrusting: false };
    bullets = [];
    asteroids = [];
    ufo = null;
    ufoBullets = [];
    keys = { left: false, right: false, thrust: false, fire: false };
    ufoTimer = randRange(12, 18);
    score = 0;
    wave = 1;
    particles.clear();
    startWave(wave);
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

  function wrap(v, max) {
    return ((v % max) + max) % max;
  }
  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  // ---------- input ----------

  function setKey(name, val) {
    keys[name] = val;
  }

  function onKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setKey("left", true);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setKey("right", true);
    else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") setKey("thrust", true);
    else if (e.key === " " || e.key === "z" || e.key === "Z" || e.key === "x" || e.key === "X") {
      e.preventDefault();
      if (phase === "title" || phase === "gameover") { startOrRestart(); return; }
      ensureAudio();
      setKey("fire", true);
    }
  }
  function onKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setKey("left", false);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setKey("right", false);
    else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") setKey("thrust", false);
    else if (e.key === " " || e.key === "z" || e.key === "Z" || e.key === "x" || e.key === "X") setKey("fire", false);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function onCanvasPointerDown() {
    if (phase === "title" || phase === "gameover") startOrRestart();
  }
  canvas.addEventListener("pointerdown", onCanvasPointerDown);

  function startOrRestart() {
    ensureAudio();
    lives = START_LIVES;
    freshWorld();
    setState("playing", hudSnapshot());
  }

  function hudSnapshot() {
    return { lives, score, wave };
  }

  // ---------- combat ----------

  function fireBullet() {
    const forward = { x: Math.sin(ship.angle), y: -Math.cos(ship.angle) };
    bullets.push({
      x: ship.x + forward.x * SHIP_RADIUS,
      y: ship.y + forward.y * SHIP_RADIUS,
      vx: ship.vx + forward.x * BULLET_SPEED,
      vy: ship.vy + forward.y * BULLET_SPEED,
      life: BULLET_LIFETIME,
    });
    beep(720, 0.05, "square", 0.05);
  }

  function breakAsteroid(a) {
    score += SIZES[a.size].score;
    particles.burst(a.x, a.y, { color: "#cfd6de", count: 14, speed: 140, life: 0.4, size: 2.5 });
    beep(160, 0.12, "sawtooth", 0.1);
    const child = CHILD_SIZE[a.size];
    if (child) {
      spawnAsteroid(child, a.x, a.y, a.vx, a.vy);
      spawnAsteroid(child, a.x, a.y, a.vx, a.vy);
    }
  }

  function hurtShip() {
    if (ship.invuln > 0) return;
    shake.trigger(10, 0.35);
    particles.burst(ship.x, ship.y, { color: "#8fe3ff", count: 20, speed: 170, life: 0.5 });
    beep(120, 0.25, "sawtooth", 0.16);
    lives -= 1;
    if (lives <= 0) {
      setState("gameover", { lives: 0, score, wave });
      return;
    }
    ship.x = LOGICAL_W / 2;
    ship.y = LOGICAL_H / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.invuln = INVULN_TIME;
    onState("playing", hudSnapshot());
  }

  // ---------- update ----------

  function updateShip(dt) {
    if (ship.invuln > 0) ship.invuln = Math.max(0, ship.invuln - dt);
    if (keys.left) ship.angle -= ROTATE_SPEED * dt;
    if (keys.right) ship.angle += ROTATE_SPEED * dt;

    ship.thrusting = !!keys.thrust;
    if (keys.thrust) {
      ship.vx += Math.sin(ship.angle) * THRUST_ACCEL * dt;
      ship.vy += -Math.cos(ship.angle) * THRUST_ACCEL * dt;
      if (Math.random() < 0.6) {
        const back = { x: -Math.sin(ship.angle), y: Math.cos(ship.angle) };
        particles.burst(ship.x + back.x * SHIP_RADIUS, ship.y + back.y * SHIP_RADIUS, {
          color: "#ffb35c",
          count: 1,
          speed: 60,
          life: 0.22,
          size: 2,
        });
      }
    }

    const dragFactor = Math.max(0, 1 - DRAG_PER_SEC * dt);
    ship.vx *= dragFactor;
    ship.vy *= dragFactor;
    const spd = Math.hypot(ship.vx, ship.vy);
    if (spd > MAX_SPEED) {
      ship.vx = (ship.vx / spd) * MAX_SPEED;
      ship.vy = (ship.vy / spd) * MAX_SPEED;
    }

    ship.x = wrap(ship.x + ship.vx * dt, LOGICAL_W);
    ship.y = wrap(ship.y + ship.vy * dt, LOGICAL_H);

    if (keys.fire) {
      ship.fireCooldown = Math.max(0, (ship.fireCooldown || 0) - dt);
      if (ship.fireCooldown <= 0) {
        fireBullet();
        ship.fireCooldown = FIRE_COOLDOWN;
      }
    }
  }

  function updateAsteroids(dt) {
    for (const a of asteroids) {
      a.x = wrap(a.x + a.vx * dt, LOGICAL_W);
      a.y = wrap(a.y + a.vy * dt, LOGICAL_H);
      a.rotation += a.spin * dt;
    }
  }

  function updateUfo(dt) {
    if (!ufo) {
      ufoTimer -= dt;
      if (ufoTimer <= 0) {
        const fromLeft = Math.random() < 0.5;
        ufo = {
          x: fromLeft ? -UFO_RADIUS : LOGICAL_W + UFO_RADIUS,
          y: randRange(LOGICAL_H * 0.15, LOGICAL_H * 0.85),
          vx: (fromLeft ? 1 : -1) * UFO_SPEED,
          weaveT: 0,
          fireTimer: UFO_FIRE_INTERVAL,
        };
        ufoTimer = randRange(16, 24);
      }
      return;
    }
    ufo.weaveT += dt;
    ufo.x += ufo.vx * dt;
    ufo.y += Math.sin(ufo.weaveT * 2) * 40 * dt;
    if (ufo.x < -UFO_RADIUS * 2 || ufo.x > LOGICAL_W + UFO_RADIUS * 2) {
      ufo = null;
      return;
    }
    ufo.fireTimer -= dt;
    if (ufo.fireTimer <= 0) {
      const aimAngle = Math.atan2(ship.y - ufo.y, ship.x - ufo.x) + randRange(-0.26, 0.26);
      ufoBullets.push({
        x: ufo.x,
        y: ufo.y,
        vx: Math.cos(aimAngle) * UFO_BULLET_SPEED,
        vy: Math.sin(aimAngle) * UFO_BULLET_SPEED,
        life: 1.6,
      });
      ufo.fireTimer = UFO_FIRE_INTERVAL;
      beep(300, 0.1, "square", 0.08);
    }
  }

  function updateBullets(dt) {
    for (const b of bullets) {
      b.x = wrap(b.x + b.vx * dt, LOGICAL_W);
      b.y = wrap(b.y + b.vy * dt, LOGICAL_H);
      b.life -= dt;
    }
    bullets = bullets.filter((b) => b.life > 0);

    for (const b of ufoBullets) {
      b.x = wrap(b.x + b.vx * dt, LOGICAL_W);
      b.y = wrap(b.y + b.vy * dt, LOGICAL_H);
      b.life -= dt;
    }
    ufoBullets = ufoBullets.filter((b) => b.life > 0);
  }

  function handleCollisions() {
    for (const b of bullets) {
      if (b.dead) continue;
      for (const a of asteroids) {
        if (a.dead) continue;
        if (dist(b.x, b.y, a.x, a.y) < a.radius) {
          b.dead = true;
          a.dead = true;
          breakAsteroid(a);
          break;
        }
      }
    }
    if (ufo && !ufo.dead) {
      for (const b of bullets) {
        if (b.dead) continue;
        if (dist(b.x, b.y, ufo.x, ufo.y) < UFO_RADIUS) {
          b.dead = true;
          ufo.dead = true;
          score += UFO_SCORE;
          particles.burst(ufo.x, ufo.y, { color: "#9dffb0", count: 18, speed: 160, life: 0.45 });
          beep(200, 0.18, "sawtooth", 0.12);
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead);
    bullets = bullets.filter((b) => !b.dead);
    if (ufo && ufo.dead) ufo = null;

    if (ship.invuln <= 0) {
      for (const a of asteroids) {
        if (dist(ship.x, ship.y, a.x, a.y) < a.radius + SHIP_RADIUS * 0.7) {
          a.dead = true;
          hurtShip();
          break;
        }
      }
      asteroids = asteroids.filter((a) => !a.dead);
      if (ufo && dist(ship.x, ship.y, ufo.x, ufo.y) < UFO_RADIUS + SHIP_RADIUS * 0.7) {
        ufo = null;
        hurtShip();
      }
      for (const b of ufoBullets) {
        if (!b.dead && dist(ship.x, ship.y, b.x, b.y) < SHIP_RADIUS * 0.7) {
          b.dead = true;
          hurtShip();
          break;
        }
      }
      ufoBullets = ufoBullets.filter((b) => !b.dead);
    }
  }

  function update(dt) {
    if (phase !== "playing") return;
    updateShip(dt);
    if (phase !== "playing") return;
    updateAsteroids(dt);
    updateUfo(dt);
    updateBullets(dt);
    handleCollisions();
    if (phase !== "playing") return;

    if (asteroids.length === 0) {
      wave += 1;
      shake.trigger(4, 0.25);
      beep(500, 0.3, "triangle", 0.12);
      startWave(wave);
    }

    onState("playing", hudSnapshot());
  }

  // ---------- render ----------

  function drawShip() {
    if (ship.invuln > 0 && Math.floor(ship.invuln * 14) % 2 === 0) return;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = "#dff3ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_RADIUS);
    ctx.lineTo(SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.8);
    ctx.lineTo(0, SHIP_RADIUS * 0.4);
    ctx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.8);
    ctx.closePath();
    ctx.stroke();
    if (ship.thrusting) {
      ctx.strokeStyle = "#ffb35c";
      ctx.beginPath();
      ctx.moveTo(-SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.6);
      ctx.lineTo(0, SHIP_RADIUS * 1.5 + Math.random() * 6);
      ctx.lineTo(SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);
    ctx.strokeStyle = "#aeb8c2";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const n = a.shape.length;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r = a.radius * a.shape[i];
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawUfo() {
    if (!ufo) return;
    ctx.save();
    ctx.translate(ufo.x, ufo.y);
    ctx.strokeStyle = "#9dffb0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, UFO_RADIUS, UFO_RADIUS * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -UFO_RADIUS * 0.35, UFO_RADIUS * 0.55, UFO_RADIUS * 0.4, 0, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawBullets() {
    ctx.fillStyle = "#dff3ff";
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ff6b5e";
    for (const b of ufoBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStars() {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < STAR_FIELD.length; i++) {
      const s = STAR_FIELD[i];
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
  }
  const STAR_FIELD = Array.from({ length: 80 }, () => ({
    x: Math.random() * LOGICAL_W,
    y: Math.random() * LOGICAL_H,
    size: Math.random() < 0.8 ? 1 : 2,
  }));

  function drawHud() {
    // Everything lives top-right, not the more conventional top-left: the
    // shared floating "← Portal" pill is fixed to the viewport's top-left
    // corner, and at this game's landscape aspect ratio the canvas can
    // fill the viewport edge-to-edge with zero letterbox margin (a
    // maximized-ish desktop window, or a phone in landscape), so top-left
    // canvas text would sit right underneath it. Top-right is clear of
    // that by construction, and clear of the bottom-anchored touch
    // controls too regardless of orientation.
    ctx.fillStyle = "rgba(230, 245, 250, 0.92)";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`x${Math.max(0, lives)}`, LOGICAL_W - 14, 26);
    ctx.fillText(`SCORE ${score}`, LOGICAL_W - 14, 46);
    ctx.fillText(`WAVE ${wave}`, LOGICAL_W - 14, 66);
  }

  function render() {
    ctx.fillStyle = "#05070c";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    drawStars();

    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);
    for (const a of asteroids) drawAsteroid(a);
    drawUfo();
    drawBullets();
    drawShip();
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

  return { startOrRestart, destroy, setKey };
}
