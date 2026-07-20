(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const titleScreen = document.getElementById("titleScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const gameOverText = document.getElementById("gameOverText");

  // Backoffice analytics — best-effort only, never blocks or breaks gameplay.
  const ANALYTICS_BASE = "https://pong-backoffice.agmoneilon.workers.dev";
  let currentPlayId = null;

  function trackPlayStart() {
    currentPlayId = null;
    fetch(`${ANALYTICS_BASE}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referrer: document.referrer,
        language: navigator.language,
        screen: { w: window.screen.width, h: window.screen.height },
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) currentPlayId = data.id;
      })
      .catch(() => {});
  }

  function trackPlayEnd(outcome) {
    if (currentPlayId == null) return;
    const id = currentPlayId;
    currentPlayId = null;
    fetch(`${ANALYTICS_BASE}/api/track/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, playerScore, aiScore }),
    }).catch(() => {});
  }

  // Logical (virtual) resolution the game is drawn in — the canvas backing
  // store is scaled to this so all game logic is resolution-independent.
  const LOGICAL_W = 800;
  const LOGICAL_H = 500;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const PADDLE_W = 14;
  const PADDLE_H = 90;
  const PADDLE_MARGIN = 24;
  const BALL_SIZE = 12;
  const WIN_SCORE = 11;

  const BASE_BALL_SPEED = 320; // px/s (logical)
  const MAX_BALL_SPEED = 620;
  const BALL_SPEEDUP = 1.06;
  const MAX_BOUNCE_ANGLE = (55 * Math.PI) / 180;

  const AI_MAX_SPEED = 330; // px/s
  const AI_REACTION_SLACK = 18; // px dead-zone so AI isn't a perfect wall

  let scale = 1;

  const player = { x: 0, y: 0, w: PADDLE_W, h: PADDLE_H, targetY: LOGICAL_H / 2 };
  const ai = { x: 0, y: 0, w: PADDLE_W, h: PADDLE_H };
  const ball = { x: LOGICAL_W / 2, y: LOGICAL_H / 2, vx: 0, vy: 0, speed: BASE_BALL_SPEED };

  let playerScore = 0;
  let aiScore = 0;
  let state = "title"; // "title" | "playing" | "gameover"
  let serveTimer = 0;
  let serveDirection = 1;

  player.x = PADDLE_MARGIN;
  player.y = LOGICAL_H / 2 - PADDLE_H / 2;
  ai.x = LOGICAL_W - PADDLE_MARGIN - PADDLE_W;
  ai.y = LOGICAL_H / 2 - PADDLE_H / 2;

  // ---------- Sizing ----------
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

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  resize();

  // ---------- Audio ----------
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

  // ---------- Input ----------
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

  window.addEventListener("mousemove", (e) => {
    setPlayerTarget(e.clientX, e.clientY);
  });

  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) setPlayerTarget(t.clientX, t.clientY);
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) setPlayerTarget(t.clientX, t.clientY);
    },
    { passive: false }
  );

  const keys = { up: false, down: false };
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") keys.up = true;
    if (e.key === "ArrowDown") keys.down = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp") keys.up = false;
    if (e.key === "ArrowDown") keys.down = false;
  });

  function startOrRestart() {
    ensureAudio();
    if (state === "title") {
      state = "playing";
      titleScreen.classList.add("hidden");
      serve(Math.random() < 0.5 ? -1 : 1);
      trackPlayStart();
    } else if (state === "gameover") {
      playerScore = 0;
      aiScore = 0;
      state = "playing";
      gameOverScreen.classList.add("hidden");
      serve(Math.random() < 0.5 ? -1 : 1);
      trackPlayStart();
    }
  }

  titleScreen.addEventListener("click", startOrRestart);
  titleScreen.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      startOrRestart();
    },
    { passive: false }
  );
  gameOverScreen.addEventListener("click", startOrRestart);
  gameOverScreen.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      startOrRestart();
    },
    { passive: false }
  );

  // ---------- Game logic ----------
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
    const angle = (Math.random() * 2 - 1) * (30 * Math.PI / 180);
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
    } else if (ball.y + half > LOGICAL_H) {
      ball.y = LOGICAL_H - half;
      ball.vy *= -1;
      sound.wall();
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
      onScore();
    } else if (ball.x - half > LOGICAL_W) {
      playerScore++;
      sound.score();
      onScore();
    }
  }

  function onScore() {
    if (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE) {
      state = "gameover";
      const playerWon = playerScore > aiScore;
      gameOverText.textContent = playerWon ? "YOU WIN" : "YOU LOSE";
      gameOverScreen.classList.remove("hidden");
      trackPlayEnd(playerWon ? "win" : "loss");
    } else {
      serve(ball.vx > 0 ? -1 : 1);
    }
  }

  // ---------- Rendering ----------
  function draw() {
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

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

    if (state === "playing" && serveTimer <= 0) {
      ctx.fillRect(ball.x - BALL_SIZE / 2, ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
    } else if (state !== "title") {
      ctx.fillRect(ball.x - BALL_SIZE / 2, ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
    }

    ctx.font = "48px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(String(playerScore), LOGICAL_W * 0.25, 64);
    ctx.fillText(String(aiScore), LOGICAL_W * 0.75, 64);
  }

  // ---------- Main loop ----------
  let lastTime = performance.now();

  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 1 / 30);

    if (state === "playing") {
      updatePaddles(dt);
      updateBall(dt);
    }

    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) lastTime = performance.now();
  });

  requestAnimationFrame(frame);
})();
