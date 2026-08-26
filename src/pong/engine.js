import { api } from "../shared/api.js";
import { createParticleSystem, createScreenShake } from "../shared/gameJuice.js";

// Ported near-verbatim from the original vanilla game.js. The only real change
// is that title/game-over screen visibility is reported via onState() instead
// of directly toggling DOM elements, so React can render the overlays.
export function createPongEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  let currentPlayId = null;

  function trackPlayStart() {
    currentPlayId = null;
    api
      .trackStart({
        referrer: document.referrer,
        language: navigator.language,
        screen: { w: window.screen.width, h: window.screen.height },
      })
      .then((data) => {
        if (data) currentPlayId = data.id;
      });
  }

  function trackPlayEnd(outcome) {
    if (currentPlayId == null) return;
    const id = currentPlayId;
    currentPlayId = null;
    api.trackEnd(id, { outcome, playerScore, aiScore }).catch(() => {});
  }

  const LOGICAL_W = 800;
  const LOGICAL_H = 500;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const PADDLE_W = 14;
  const PADDLE_H = 90;
  const PADDLE_MARGIN = 24;
  const BALL_SIZE = 12;
  const WIN_SCORE = 11;

  const BASE_BALL_SPEED = 320;
  const MAX_BALL_SPEED = 620;
  const BALL_SPEEDUP = 1.06;
  const MAX_BOUNCE_ANGLE = (55 * Math.PI) / 180;

  const AI_MAX_SPEED = 330;
  const AI_REACTION_SLACK = 18;

  let scale = 1;
  const particles = createParticleSystem();
  const shake = createScreenShake();

  const player = { x: 0, y: 0, w: PADDLE_W, h: PADDLE_H, targetY: LOGICAL_H / 2 };
  const ai = { x: 0, y: 0, w: PADDLE_W, h: PADDLE_H };
  const ball = { x: LOGICAL_W / 2, y: LOGICAL_H / 2, vx: 0, vy: 0, speed: BASE_BALL_SPEED };

  let playerScore = 0;
  let aiScore = 0;
  let state = "title";
  let serveTimer = 0;
  let serveDirection = 1;

  player.x = PADDLE_MARGIN;
  player.y = LOGICAL_H / 2 - PADDLE_H / 2;
  ai.x = LOGICAL_W - PADDLE_MARGIN - PADDLE_W;
  ai.y = LOGICAL_H / 2 - PADDLE_H / 2;

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
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  const sound = {
    paddle: () => beep(440, 0.08),
    wall: () => beep(220, 0.06),
    score: () => beep(140, 0.35),
  };

  function clientToLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * LOGICAL_W,
      y: ((clientY - rect.top) / rect.height) * LOGICAL_H,
    };
  }

  function setPlayerTarget(clientX, clientY) {
    const p = clientToLogical(clientX, clientY);
    player.targetY = p.y;
  }

  function onMouseMove(e) {
    setPlayerTarget(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (t) setPlayerTarget(t.clientX, t.clientY);
  }

  window.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("touchstart", onTouchMove, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });

  const keys = { up: false, down: false };
  function onKeyDown(e) {
    if (e.key === "ArrowUp") keys.up = true;
    if (e.key === "ArrowDown") keys.down = true;
  }
  function onKeyUp(e) {
    if (e.key === "ArrowUp") keys.up = false;
    if (e.key === "ArrowDown") keys.down = false;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function startOrRestart() {
    ensureAudio();
    if (state === "title") {
      setState("playing");
      serve(Math.random() < 0.5 ? -1 : 1);
      trackPlayStart();
    } else if (state === "gameover") {
      playerScore = 0;
      aiScore = 0;
      setState("playing");
      serve(Math.random() < 0.5 ? -1 : 1);
      trackPlayStart();
    }
  }

  function serve(direction) {
    serveDirection = direction;
    ball.x = LOGICAL_W / 2;
    ball.y = LOGICAL_H / 2;
    ball.speed = BASE_BALL_SPEED;
    ball.vx = 0;
    ball.vy = 0;
    serveTimer = 0.7;
  }

  function launchBall() {
    const angle = (Math.random() * 2 - 1) * ((30 * Math.PI) / 180);
    ball.vx = Math.cos(angle) * ball.speed * serveDirection;
    ball.vy = Math.sin(angle) * ball.speed;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function updatePaddles(dt) {
    if (keys.up || keys.down) {
      const speed = 420;
      if (keys.up) player.targetY = player.y + player.h / 2 - speed * dt;
      if (keys.down) player.targetY = player.y + player.h / 2 + speed * dt;
    }

    const desiredY = clamp(player.targetY - player.h / 2, 0, LOGICAL_H - player.h);
    player.y += (desiredY - player.y) * Math.min(1, dt * 18);

    const aiCenter = ai.y + ai.h / 2;
    const diff = ball.y - aiCenter;
    if (Math.abs(diff) > AI_REACTION_SLACK) {
      const dir = Math.sign(diff);
      ai.y += dir * AI_MAX_SPEED * dt;
    }
    ai.y = clamp(ai.y, 0, LOGICAL_H - ai.h);
  }

  function reflectOffPaddle(paddle, dirSign) {
    const relative = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
    const angle = clamp(relative, -1, 1) * MAX_BOUNCE_ANGLE;
    ball.speed = Math.min(ball.speed * BALL_SPEEDUP, MAX_BALL_SPEED);
    ball.vx = Math.cos(angle) * ball.speed * dirSign;
    ball.vy = Math.sin(angle) * ball.speed;
    sound.paddle();
    particles.burst(ball.x, ball.y, { color: "#ffffff", count: 9, speed: 160, life: 0.3, size: 2.2 });
    shake.trigger(2.5, 0.08);
  }

  function updateBall(dt) {
    if (serveTimer > 0) {
      serveTimer -= dt;
      if (serveTimer <= 0) launchBall();
      return;
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    const half = BALL_SIZE / 2;

    if (ball.y - half < 0) {
      ball.y = half;
      ball.vy *= -1;
      sound.wall();
      particles.burst(ball.x, ball.y, { color: "#ffffff", count: 5, speed: 110, life: 0.25, size: 1.8 });
    } else if (ball.y + half > LOGICAL_H) {
      ball.y = LOGICAL_H - half;
      ball.vy *= -1;
      sound.wall();
      particles.burst(ball.x, ball.y, { color: "#ffffff", count: 5, speed: 110, life: 0.25, size: 1.8 });
    }

    if (
      ball.vx < 0 &&
      ball.x - half < player.x + player.w &&
      ball.x + half > player.x &&
      ball.y + half > player.y &&
      ball.y - half < player.y + player.h
    ) {
      ball.x = player.x + player.w + half;
      reflectOffPaddle(player, 1);
    }

    if (
      ball.vx > 0 &&
      ball.x + half > ai.x &&
      ball.x - half < ai.x + ai.w &&
      ball.y + half > ai.y &&
      ball.y - half < ai.y + ai.h
    ) {
      ball.x = ai.x - half;
      reflectOffPaddle(ai, -1);
    }

    if (ball.x + half < 0) {
      aiScore++;
      sound.score();
      particles.burst(0, ball.y, { color: "#ffffff", count: 20, speed: 200, life: 0.5, size: 2.5 });
      shake.trigger(6, 0.22);
      onScore();
    } else if (ball.x - half > LOGICAL_W) {
      playerScore++;
      sound.score();
      particles.burst(LOGICAL_W, ball.y, { color: "#ffffff", count: 20, speed: 200, life: 0.5, size: 2.5 });
      shake.trigger(6, 0.22);
      onScore();
    }
  }

  function onScore() {
    if (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE) {
      const playerWon = playerScore > aiScore;
      setState("gameover", { text: playerWon ? "YOU WIN" : "YOU LOSE" });
      trackPlayEnd(playerWon ? "win" : "loss");
    } else {
      serve(ball.vx > 0 ? -1 : 1);
    }
  }

  function draw() {
    const off = shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);

    ctx.clearRect(-10, -10, LOGICAL_W + 20, LOGICAL_H + 20);
    ctx.fillStyle = "#000";
    ctx.fillRect(-10, -10, LOGICAL_W + 20, LOGICAL_H + 20);

    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.setLineDash([8, 12]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(LOGICAL_W / 2, 0);
    ctx.lineTo(LOGICAL_W / 2, LOGICAL_H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#fff";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillRect(ai.x, ai.y, ai.w, ai.h);

    if (state !== "title") {
      ctx.fillRect(ball.x - BALL_SIZE / 2, ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
    }

    particles.draw(ctx);

    ctx.font = "48px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(String(playerScore), LOGICAL_W * 0.25, 64);
    ctx.fillText(String(aiScore), LOGICAL_W * 0.75, 64);

    ctx.restore();
  }

  let lastTime = performance.now();
  let rafId = null;

  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 1 / 30);

    if (state === "playing") {
      updatePaddles(dt);
      updateBall(dt);
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
    canvas.removeEventListener("touchstart", onTouchMove);
    canvas.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart, destroy };
}
