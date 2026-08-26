import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// A from-scratch Snake homage: a garden vine that grows by eating fruit.
// Same architecture as Pong's engine (logical coordinate space + canvas
// scaling, requestAnimationFrame loop, onState callback for React
// overlays) adapted for a discrete grid instead of continuous physics.
export function createVineEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");
  const particles = createParticleSystem();
  const shake = createScreenShake();

  const COLS = 20;
  const ROWS = 20;
  const CELL = 26;
  const LOGICAL_W = COLS * CELL;
  const LOGICAL_H = ROWS * CELL;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const START_LENGTH = 3;
  const START_STEP_S = 0.15;
  const MIN_STEP_S = 0.075;
  const STEP_SPEEDUP = 0.004;

  let scale = 1;
  let state = "title";
  let vine = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let fruit = { x: 0, y: 0 };
  let score = 0;
  let stepSeconds = START_STEP_S;
  let stepTimer = 0;

  function setState(next, extra) {
    state = next;
    onState(next, extra);
  }

  function resize() {
    let cssW = window.innerWidth;
    let cssH = window.innerHeight;

    if (cssW / cssH > ASPECT) {
      cssW = cssH * ASPECT;
    } else {
      cssH = cssW / ASPECT;
    }

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

  function beep(freq, duration) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.13, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  const sound = {
    eat: () => beep(660, 0.08),
    dead: () => beep(110, 0.4),
  };

  function randomCell() {
    return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  }

  function placeFruit() {
    let candidate;
    do {
      candidate = randomCell();
    } while (vine.some((s) => s.x === candidate.x && s.y === candidate.y));
    fruit = candidate;
  }

  function reset() {
    const midY = Math.floor(ROWS / 2);
    vine = Array.from({ length: START_LENGTH }, (_, i) => ({ x: START_LENGTH - 1 - i, y: midY }));
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    stepSeconds = START_STEP_S;
    stepTimer = 0;
    placeFruit();
  }

  function setDirection(dx, dy) {
    // Reject reversals (can't turn 180 into your own neck) and no-ops.
    if (dx === -direction.x && dy === -direction.y) return;
    if (dx === direction.x && dy === direction.y) return;
    nextDirection = { x: dx, y: dy };
  }

  function onKeyDown(e) {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") setDirection(0, -1);
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") setDirection(0, 1);
    else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setDirection(-1, 0);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setDirection(1, 0);
    else if (e.key === " ") startOrRestart();
  }
  window.addEventListener("keydown", onKeyDown);

  let touchStart = null;
  function onTouchStart(e) {
    const t = e.touches[0];
    if (t) touchStart = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return; // treat as a tap, not a swipe
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
    else setDirection(0, dy > 0 ? 1 : -1);
  }
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd, { passive: true });

  function startOrRestart() {
    ensureAudio();
    if (state === "title" || state === "gameover") {
      reset();
      setState("playing");
    }
  }

  function step() {
    direction = nextDirection;
    const head = vine[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    const headPx = head.x * CELL + CELL / 2;
    const headPy = head.y * CELL + CELL / 2;

    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      sound.dead();
      shake.trigger(6, 0.3);
      particles.burst(headPx, headPy, { color: "#39ff6a", count: 22, speed: 170, life: 0.6 });
      setState("gameover", { score });
      return;
    }

    const wouldEat = newHead.x === fruit.x && newHead.y === fruit.y;
    const bodyToCheck = wouldEat ? vine : vine.slice(0, -1);
    if (bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      sound.dead();
      shake.trigger(6, 0.3);
      particles.burst(headPx, headPy, { color: "#39ff6a", count: 22, speed: 170, life: 0.6 });
      setState("gameover", { score });
      return;
    }

    vine.unshift(newHead);
    if (wouldEat) {
      score += 1;
      stepSeconds = Math.max(MIN_STEP_S, START_STEP_S - score * STEP_SPEEDUP);
      sound.eat();
      particles.burst(newHead.x * CELL + CELL / 2, newHead.y * CELL + CELL / 2, {
        color: "#e0682a",
        count: 12,
        speed: 130,
        life: 0.4,
        size: 2.5,
      });
      placeFruit();
    } else {
      vine.pop();
    }
  }

  function draw() {
    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);

    ctx.clearRect(-10, -10, LOGICAL_W + 20, LOGICAL_H + 20);
    ctx.fillStyle = "#050b06";
    ctx.fillRect(-10, -10, LOGICAL_W + 20, LOGICAL_H + 20);

    ctx.strokeStyle = "rgba(57, 255, 106, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, LOGICAL_H);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(LOGICAL_W, y * CELL);
      ctx.stroke();
    }

    if (state !== "title") {
      ctx.fillStyle = "#e0682a";
      const fx = fruit.x * CELL + CELL / 2;
      const fy = fruit.y * CELL + CELL / 2;
      ctx.beginPath();
      ctx.arc(fx, fy, CELL * 0.32, 0, Math.PI * 2);
      ctx.fill();

      vine.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? "#7dffa0" : "#39ff6a";
        ctx.fillRect(seg.x * CELL + 1.5, seg.y * CELL + 1.5, CELL - 3, CELL - 3);
      });
    }

    particles.draw(ctx);

    ctx.font = "20px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(125, 255, 160, 0.85)";
    ctx.fillText(String(score), 12, 26);

    ctx.restore();
  }

  let lastTime = performance.now();
  let rafId = null;

  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 1 / 20);

    if (state === "playing") {
      stepTimer += dt;
      while (stepTimer >= stepSeconds) {
        stepTimer -= stepSeconds;
        step();
        if (state !== "playing") {
          stepTimer = 0;
          break;
        }
      }
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
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchend", onTouchEnd);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart, setDirection, destroy };
}
