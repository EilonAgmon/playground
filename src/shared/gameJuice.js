// Reusable "juice" for the canvas arcade games: a lightweight particle
// burst system and a screen-shake helper. Built once so every game gets
// the same satisfying impact feedback instead of six hand-rolled copies.

export function createParticleSystem() {
  let particles = [];

  function burst(x, y, { color = "#ffffff", count = 14, speed = 140, life = 0.5, size = 3 } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random() * 0.7);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life,
        maxLife: life,
        color,
        size: size * (0.6 + Math.random() * 0.8),
      });
    }
  }

  function update(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
  }

  function draw(ctx) {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    particles = [];
  }

  return { burst, update, draw, clear };
}

export function createScreenShake() {
  let duration = 0;
  let time = 0;
  let magnitude = 0;

  function trigger(mag, dur) {
    magnitude = mag;
    duration = dur;
    time = dur;
  }

  function update(dt) {
    if (time > 0) time = Math.max(0, time - dt);
  }

  function offset() {
    if (time <= 0) return { x: 0, y: 0 };
    const falloff = time / duration;
    const m = magnitude * falloff;
    return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m };
  }

  return { trigger, update, offset };
}
