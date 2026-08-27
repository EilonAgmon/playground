export const LEVELS = [
  { key: "junior", name: "Junior", hireCost: 20, salary: 6, output: 1 },
  { key: "mid", name: "Mid-level", hireCost: 45, salary: 11, output: 2 },
  { key: "senior", name: "Senior", hireCost: 90, salary: 18, output: 3.5 },
  { key: "staff", name: "Staff", hireCost: 180, salary: 30, output: 6 },
];
export const LEVEL_MAP = Object.fromEntries(LEVELS.map((l) => [l.key, l]));

export const MILESTONES = [
  { min: 0, title: "Two people and a laptop" },
  { min: 3, title: "Seed-stage scrappy" },
  { min: 8, title: "Series A energy" },
  { min: 15, title: "Growing pains" },
  { min: 25, title: "Real engineering org" },
  { min: 35, title: "Director-of-Engineering territory" },
  { min: 45, title: "45 engineers, 3 live games, ~350K DAU" },
];

export function milestoneFor(count) {
  return [...MILESTONES].reverse().find((m) => count >= m.min) || MILESTONES[0];
}

const NAMES = [
  "Maya", "Noah", "Ravi", "Elena", "Omar", "Zoe", "Leo", "Aisha", "Sam", "Priya",
  "Jonas", "Mei", "Diego", "Ingrid", "Kwame", "Talia", "Yuki", "Nora", "Theo", "Sofia",
];

function randomName(existing) {
  const pool = NAMES.filter((n) => !existing.includes(n));
  const list = pool.length ? pool : NAMES;
  return list[Math.floor(Math.random() * list.length)];
}

export const TICK_MS = 3600;
export const SHIP_THRESHOLD = 40;
export const MAX_OFFLINE_TICKS = 300;
export const SAVE_KEY = "hq_state_v2";

export const STAT_HELP = {
  cash: "Drains on salaries every week. Refills when you ship.",
  morale: "Drifts down on its own. Low morale throttles everyone's output.",
  velocity: "Feature-track output fills this. Ships — and resets — at the top.",
  quality: "Bug-track output fills this. Decays if neglected. Keeps incidents rarer.",
  dau: "Grows only when you ship a feature.",
};

// Not a persisted counter: state (including engineer ids) is saved to
// localStorage and reloaded across sessions, so a module-scoped counter
// would restart at 1 on every page load and collide with restored ids.
function nextId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const EVENTS = [
  {
    key: "bonus",
    kind: "instant",
    weight: 3,
    text: () => "Leadership throws a small bonus your way.",
    apply: (s) => ({ cash: s.cash + 15 + s.engineers.length * 2 }),
  },
  {
    key: "flaky-tests",
    kind: "instant",
    weight: 2,
    text: () => "A flaky test suite eats a day of velocity.",
    apply: (s) => ({ velocity: Math.max(0, s.velocity - 6) }),
  },
  {
    key: "free-lunch",
    kind: "instant",
    weight: 2,
    text: () => "Free lunch Friday. Morale ticks up.",
    apply: (s) => ({ morale: Math.min(100, s.morale + 4) }),
  },
  {
    key: "incident",
    kind: "choice",
    // Neglected quality makes incidents noticeably more likely; a well-kept
    // quality buffer makes them rarer — the whole point of the Bugs track.
    weight: (s) => 3 * (1.6 - s.quality / 100),
    condition: (s) => s.engineers.length > 0,
    text: () => "Production incident! The pager is going off.",
    options: [
      {
        label: "All hands firefight",
        hint: "-8 cash · -10 velocity · -4 morale",
        apply: (s) => ({ cash: s.cash - 8, velocity: Math.max(0, s.velocity - 10), morale: Math.max(0, s.morale - 4) }),
        result: "The team drops everything and fixes it fast.",
      },
      {
        label: "Patch and pray",
        hint: "-10 morale",
        apply: (s) => ({ morale: Math.max(0, s.morale - 10) }),
        result: "It holds together. Barely. Morale takes the hit.",
      },
    ],
  },
  {
    key: "poach",
    kind: "choice",
    weight: 2,
    condition: (s) => s.engineers.some((e) => e.level === "senior" || e.level === "staff"),
    text: (s) => {
      const target = s.engineers.find((e) => e.level === "senior" || e.level === "staff");
      return `${target ? target.name : "A key engineer"} got a competing offer.`;
    },
    options: [
      {
        label: "Counter-offer",
        hint: "-30 cash · +3 morale",
        apply: (s) => ({ cash: s.cash - 30, morale: Math.min(100, s.morale + 3) }),
        result: "You match the offer. They stay, relieved.",
      },
      {
        label: "Let them go",
        hint: "-1 engineer · -6 morale",
        apply: (s) => {
          const idx = s.engineers.findIndex((e) => e.level === "senior" || e.level === "staff");
          const engineers = idx >= 0 ? s.engineers.filter((_, i) => i !== idx) : s.engineers;
          return { engineers, morale: Math.max(0, s.morale - 6) };
        },
        result: "They take the offer. The team feels it.",
      },
    ],
  },
];

function moraleFactor(morale) {
  return Math.max(0.3, Math.min(1, morale / 100));
}

function pushLog(state, text) {
  return { ...state, log: [...state.log, text].slice(-8) };
}

function weightOf(event, state) {
  return typeof event.weight === "function" ? event.weight(state) : event.weight;
}

function rollEvent(state, allowChoice) {
  if (state.gameOver || state.pendingEvent) return state;
  if (Math.random() > 0.16) return state;
  const pool = EVENTS.filter((e) => (allowChoice || e.kind !== "choice") && (!e.condition || e.condition(state)));
  if (!pool.length) return state;

  const totalWeight = pool.reduce((sum, e) => sum + weightOf(e, state), 0);
  let r = Math.random() * totalWeight;
  let chosen = pool[0];
  for (const e of pool) {
    const w = weightOf(e, state);
    if (r < w) {
      chosen = e;
      break;
    }
    r -= w;
  }

  if (chosen.kind === "instant") {
    const patch = chosen.apply(state);
    return pushLog({ ...state, ...patch }, chosen.text(state));
  }
  return { ...state, pendingEvent: { key: chosen.key, text: chosen.text(state), options: chosen.options } };
}

export function createInitialState() {
  const first = randomName([]);
  const second = randomName([first]);
  return {
    cash: 60,
    engineers: [
      { id: nextId(), name: first, level: "junior", track: "feature" },
      { id: nextId(), name: second, level: "junior", track: "bugs" },
    ],
    morale: 80,
    velocity: 0,
    quality: 70,
    reputation: 0,
    week: 0,
    log: ["You and one other engineer. A laptop. A dream."],
    pendingEvent: null,
    gameOver: false,
    lastSavedAt: Date.now(),
  };
}

export function tick(state, { allowChoiceEvents = true } = {}) {
  if (state.gameOver || state.pendingEvent) return state;

  let s = { ...state, engineers: state.engineers.map((e) => ({ ...e })) };
  const salaries = s.engineers.reduce((sum, e) => sum + LEVEL_MAP[e.level].salary, 0);
  const factor = moraleFactor(s.morale);
  const featureOut =
    s.engineers.filter((e) => e.track === "feature").reduce((sum, e) => sum + LEVEL_MAP[e.level].output, 0) * factor;
  const bugOut =
    s.engineers.filter((e) => e.track === "bugs").reduce((sum, e) => sum + LEVEL_MAP[e.level].output, 0) * factor;

  s.cash -= salaries;
  s.velocity += featureOut;
  s.quality = Math.max(0, Math.min(100, s.quality - 0.4 + bugOut));
  s.morale = Math.max(0, s.morale - 0.3);
  s.week += 1;

  if (s.velocity >= SHIP_THRESHOLD) {
    s.velocity -= SHIP_THRESHOLD;
    const reward = 20 + s.reputation * 3;
    s.cash += reward;
    s.reputation += 1;
    s.morale = Math.min(100, s.morale + 3);
    s = pushLog(s, `Shipped a feature. +${reward} cash.`);
  }

  if (s.morale < 15 && s.engineers.length > 0 && Math.random() < 0.1) {
    const idx = Math.floor(Math.random() * s.engineers.length);
    const gone = s.engineers[idx];
    s.engineers = s.engineers.filter((_, i) => i !== idx);
    s = pushLog(s, `${gone.name} burned out and quit.`);
  }

  s = rollEvent(s, allowChoiceEvents);

  if (s.cash < 0) {
    s.gameOver = true;
    s = pushLog(s, "Out of runway. HQ shuts its doors.");
  }

  s.lastSavedAt = Date.now();
  return s;
}

export function hireEngineer(state, levelKey) {
  const level = LEVEL_MAP[levelKey];
  if (!level || state.cash < level.hireCost || state.gameOver) return state;
  const engineer = { id: nextId(), name: randomName(state.engineers.map((e) => e.name)), level: levelKey, track: "feature" };
  return pushLog(
    { ...state, cash: state.cash - level.hireCost, engineers: [...state.engineers, engineer] },
    `${engineer.name} joins as a ${level.name} engineer.`
  );
}

export function setTrack(state, id, track) {
  return { ...state, engineers: state.engineers.map((e) => (e.id === id ? { ...e, track } : e)) };
}

export function fireEngineer(state, id) {
  const eng = state.engineers.find((e) => e.id === id);
  if (!eng) return state;
  return pushLog({ ...state, engineers: state.engineers.filter((e) => e.id !== id) }, `${eng.name} leaves the team.`);
}

export function resolveEvent(state, optionIndex) {
  if (!state.pendingEvent) return state;
  const option = state.pendingEvent.options[optionIndex];
  const patch = option.apply(state);
  const next = pushLog({ ...state, ...patch, pendingEvent: null }, option.result);
  return next.cash < 0 ? { ...next, gameOver: true } : next;
}
