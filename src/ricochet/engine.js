// A from-scratch Breakout/Arkanoid homage. Same architecture as Pong's
// engine (logical coordinate space + canvas scaling, requestAnimationFrame
// loop, onState callback for React overlays), with brick-field physics
// instead of a second paddle.
export function createRicochetEngine(canvas, { onState }) {
  const ctx = canvas.getContext("2d");

  const LOGICAL_W = 800;
  const LOGICAL_H = 520;
  const ASPECT = LOGICAL_W / LOGICAL_H;

  const PADDLE_W = 110;
  const PADDLE_H = 14;
  const PADDLE_Y = LOGICAL_H - 36;
  const BALL_RADIUS = 7;
  const START_LIVES = 3;

  const BASE_BALL_SPEED = 340;
  const MAX_BALL_SPEED = 560;
  const BALL_SPEEDUP = 1.01;
  const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180;

  const BRICK_ROWS = 6;
  const BRICK_COLS = 10;
  const BRICK_TOP = 70;
  const BRICK_SIDE_MARGIN = 24;
  const BRICK_GAP = 6;
  const BRICK_H = 20;
  const BRICK_W = (LOGICAL_W - BRICK_SIDE_MARGIN * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;
  const ROW_COLORS = ["#ff5964", "#ff9a3c", "#f4e04d", "#79c99e", "#4fb0c6", "#9d7bd8"];
  const ROW_POINTS = [7, 6, 5, 4, 3, 2];

  let scale = 1;
  let state = "title";
  let score = 0;
  let lives = START_LIVES;
  let attached = true;
  let serveTimer = 0;

  const paddle = { x: LOGICAL_W / 2 - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H, targetX: LOGICAL_W / 2 };
  const ball = { x: LOGICAL_W / 2, y: PADDLE_Y - BALL_RADIUS - 1, vx: 0, vy: 0, speed: BASE_BALL_SPEED };
  let bricks = [];

  function setState(next, extra) {
    state = next;
    onState(next, extra);
  }

  function buildBricks() {
    bricks = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: BRICK_SIDE_MARGIN + col * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
          w: BRICK_W,
          h: BRICK_H,
          alive: true,
          color: ROW_COLORS[row],
          points: ROW_POINTS[row],
        });
      }
    }
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
    paddle: () => beep(330, 0.07),
    wall: () => beep(220, 0.05),
    brick: (points) => beep(440 + points * 40, 0.08),
    lose: () => beep(140, 0.3),
    win: () => beep(880, 0.4),
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function clientToLogicalX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * LOGICAL_W;
  }

  function setPaddleTarget(clientX) {
    paddle.targetX = clientToLogicalX(clientX);
  }

  function onMouseMove(e) {
    setPaddleTarget(e.clientX);
  }
  window.addEventListener("mousemove", onMouseMove);

  function onCanvasClick() {
    launchOrStart();
  }
  canvas.addEventListener("click", onCanvasClick);

  // touchend also has to launch on a tap, but dragging to reposition the
  // paddle also ends in a touchend — only treat it as a launch-tap if the
  // finger barely moved, or every paddle drag would also fire the ball.
  let touchStartPos = null;
  function onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (t) {
      touchStartPos = { x: t.clientX, y: t.clientY };
      setPaddleTarget(t.clientX);
    }
  }
  function onTouchDrag(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (t) setPaddleTarget(t.clientX);
  }
  function onTouchEnd(e) {
    const t = e.changedTouches[0];
    if (touchStartPos && t) {
      const dx = t.clientX - touchStartPos.x;
      const dy = t.clientY - touchStartPos.y;
      if (Math.hypot(dx, dy) < 12) launchOrStart();
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
    if (e.key === " ") launchOrStart();
  }
  function onKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function resetBall() {
    attached = true;
    ball.speed = BASE_BALL_SPEED;
    ball.vx = 0;
    ball.vy = 0;
    serveTimer = 0;
  }

  function launch() {
    attached = false;
    const angle = (Math.random() * 2 - 1) * ((25 * Math.PI) / 180) - Math.PI / 2;
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
  }

  function launchOrStart() {
    ensureAudio();
    if (state === "title" || state === "gameover") {
      startOrRestart();
    } else if (state === "playing" && attached) {
      launch();
    }
  }

  function startOrRestart() {
    ensureAudio();
    score = 0;
    lives = START_LIVES;
    buildBricks();
    resetBall();
    paddle.x = LOGICAL_W / 2 - PADDLE_W / 2;
    paddle.targetX = LOGICAL_W / 2;
    setState("playing");
  }

  function reflectOffPaddle() {
    const relative = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const angle = clamp(relative, -1, 1) * MAX_BOUNCE_ANGLE - Math.PI / 2;
    ball.speed = Math.min(ball.speed * 1.02, MAX_BALL_SPEED);
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
    sound.paddle();
  }

  function updatePaddle(dt) {
    if (keys.left || keys.right) {
      const speed = 480;
      if (keys.left) paddle.targetX = paddle.x + paddle.w / 2 - speed * dt;
      if (keys.right) paddle.targetX = paddle.x + paddle.w / 2 + speed * dt;
    }
    const desiredX = clamp(paddle.targetX - paddle.w / 2, 0, LOGICAL_W - paddle.w);
    paddle.x += (desiredX - paddle.x) * Math.min(1, dt * 22);
  }

  function updateBall(dt) {
    if (attached) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - BALL_RADIUS - 1;
      return;
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - BALL_RADIUS < 0) {
      ball.x = BALL_RADIUS;
      ball.vx *= -1;
      sound.wall();
    } else if (ball.x + BALL_RADIUS > LOGICAL_W) {
      ball.x = LOGICAL_W - BALL_RADIUS;
      ball.vx *= -1;
      sound.wall();
    }
    if (ball.y - BALL_RADIUS < 0) {
      ball.y = BALL_RADIUS;
      ball.vy *= -1;
      sound.wall();
    }

    if (
      ball.vy > 0 &&
      ball.y + BALL_RADIUS > paddle.y &&
      ball.y - BALL_RADIUS < paddle.y + paddle.h &&
      ball.x + BALL_RADIUS > paddle.x &&
      ball.x - BALL_RADIUS < paddle.x + paddle.w
    ) {
      ball.y = paddle.y - BALL_RADIUS;
      reflectOffPaddle();
    }

    for (const brick of bricks) {
      if (!brick.alive) continue;
      const overlapping =
        ball.x + BALL_RADIUS > brick.x &&
        ball.x - BALL_RADIUS < brick.x + brick.w &&
        ball.y + BALL_RADIUS > brick.y &&
        ball.y - BALL_RADIUS < brick.y + brick.h;
      if (!overlapping) continue;

      const overlapX = Math.min(ball.x + BALL_RADIUS, brick.x + brick.w) - Math.max(ball.x - BALL_RADIUS, brick.x);
      const overlapY = Math.min(ball.y + BALL_RADIUS, brick.y + brick.h) - Math.max(ball.y - BALL_RADIUS, brick.y);
      if (overlapX < overlapY) ball.vx *= -1;
      else ball.vy *= -1;

      brick.alive = false;
      score += brick.points;
      ball.speed = Math.min(ball.speed * BALL_SPEEDUP, MAX_BALL_SPEED);
      sound.brick(brick.points);
      break;
    }

    if (bricks.every((b) => !b.alive)) {
      sound.win();
      setState("gameover", { text: "CLEARED", score });
      return;
    }

    if (ball.y - BALL_RADIUS > LOGICAL_H) {
      lives -= 1;
      if (lives <= 0) {
        sound.lose();
        setState("gameover", { text: "OUT OF LIVES", score });
      } else {
        resetBall();
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.fillStyle = "#0a0a16";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    for (const brick of bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = brick.color;
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#e8ecff";
    ctx.shadowColor = "#7dc4ff";
    ctx.shadowBlur = 8;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    if (state !== "title") {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (state === "playing" && attached) {
      ctx.font = "16px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(232, 236, 255, 0.7)";
      ctx.fillText("tap, click, or space to launch", LOGICAL_W / 2, ball.y - 20);
    }

    ctx.font = "20px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(232, 236, 255, 0.85)";
    ctx.fillText(`Score ${score}`, 14, 26);
    ctx.textAlign = "right";
    ctx.fillText(`${"♥".repeat(Math.max(0, lives))}`, LOGICAL_W - 14, 26);
  }

  let lastTime = performance.now();
  let rafId = null;

  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 1 / 30);

    if (state === "playing") {
      updatePaddle(dt);
      updateBall(dt);
    }

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
    canvas.removeEventListener("click", onCanvasClick);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchDrag);
    canvas.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { startOrRestart: launchOrStart, destroy };
}
