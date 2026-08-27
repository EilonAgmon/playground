import { REPORTS, ONE_ON_ONES, CANDIDATES, HIRE_CALLS, scoreCall } from "./scenarios.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickShift() {
  const reportKeys = shuffle(REPORTS.map((r) => r.key)).slice(0, 2);
  const oneOnOnes = reportKeys.map((rk) => ({
    type: "oneOnOne",
    scenario: ONE_ON_ONES.find((s) => s.reportKey === rk),
  }));
  const candidate = CANDIDATES[Math.floor(Math.random() * CANDIDATES.length)];
  return shuffle([...oneOnOnes, { type: "hiring", scenario: candidate }]);
}

function currentSession(state) {
  return state.sessionQueue[state.sessionIndex];
}

function currentBeat(state) {
  const session = currentSession(state);
  return session.scenario.beats[state.currentBeatKey];
}

export function createInitialState() {
  return { phase: "intro" };
}

function openSession(base, index) {
  const session = base.sessionQueue[index];
  return {
    ...base,
    phase: "beat",
    sessionIndex: index,
    currentBeatKey: session.scenario.startBeat,
    // The opener is scene-setting narration ("Maya's already got her
    // laptop half-closed..."), not a line of dialogue — attributing it to
    // the character's name reads as them narrating themselves in third
    // person, so it goes in as an unattributed narration line instead.
    log: [{ speaker: null, text: session.scenario.opener }],
  };
}

export function startShift() {
  const sessionQueue = pickShift();
  return openSession(
    { sessionQueue, trustDelta: {}, moraleTotal: 0, hireResults: [] },
    0
  );
}

// Applies one dialogue option: logs the player's line, moves to the option's
// `next` beat, logs that beat's line, and routes to whichever phase that
// beat calls for (another set of options, a terminal outcome to read, or —
// for hiring sessions — the make-the-call screen).
export function choose(state, optionIndex) {
  if (state.phase !== "beat") return state;
  const session = currentSession(state);
  const beat = currentBeat(state);
  const option = beat.options[optionIndex];
  const nextKey = option.next;
  const nextBeat = session.scenario.beats[nextKey];

  const trustDelta = { ...state.trustDelta };
  let moraleTotal = state.moraleTotal;
  if (session.type === "oneOnOne") {
    const rk = session.scenario.reportKey;
    trustDelta[rk] = (trustDelta[rk] || 0) + (option.trust || 0);
    moraleTotal += option.morale || 0;
  }
  if (typeof nextBeat.morale === "number") moraleTotal += nextBeat.morale;

  const log = [...state.log, { speaker: "You", text: option.label }];
  if (nextBeat.text) log.push({ speaker: nextBeat.speaker, text: nextBeat.text });

  let phase = "beat";
  if (nextBeat.isFinal) phase = "hire_call";
  else if (!nextBeat.options) phase = "outcome";

  return { ...state, phase, currentBeatKey: nextKey, trustDelta, moraleTotal, log };
}

export function makeHireCall(state, callKey) {
  if (state.phase !== "hire_call") return state;
  const session = currentSession(state);
  const { trueQuality, name } = session.scenario;
  const { verdict, points } = scoreCall(trueQuality, callKey);
  const callLabel = HIRE_CALLS.find((c) => c.key === callKey).label;

  const verdictText =
    verdict === "good"
      ? `The right read — ${name} turns out to have been exactly what you thought.`
      : verdict === "safe"
        ? `A safe hedge. You never find out for certain, but it costs you nothing either.`
        : `The wrong read — ${name} turns out to have been the opposite of what you thought.`;

  const log = [...state.log, { speaker: "You", text: `Verdict: ${callLabel}` }, { speaker: null, text: verdictText }];
  const hireResults = [...state.hireResults, { candidateKey: session.scenario.key, call: callKey, verdict, points }];

  return { ...state, phase: "hire_result", log, hireResults };
}

export function advanceSession(state) {
  if (state.phase !== "outcome" && state.phase !== "hire_result") return state;
  const nextIndex = state.sessionIndex + 1;
  if (nextIndex >= state.sessionQueue.length) {
    return { ...state, phase: "debrief" };
  }
  return openSession(state, nextIndex);
}

const RATINGS = [
  { min: 9, title: "Rising Star", blurb: "Every read landed. People notice managers like this — so does leadership." },
  { min: 4, title: "Steady Hand", blurb: "Solid instincts, a couple of missed openings. That's most weeks." },
  { min: -1, title: "Getting There", blurb: "You showed up, but a few of these conversations needed more from you." },
  { min: -Infinity, title: "Rough Week", blurb: "Trust took real damage today. Worth revisiting what happened." },
];

export function computeRating(state) {
  const trustSum = Object.values(state.trustDelta).reduce((a, b) => a + b, 0);
  const hirePoints = state.hireResults.reduce((a, r) => a + r.points, 0);
  const total = trustSum + state.moraleTotal + hirePoints;
  const rating = RATINGS.find((r) => total >= r.min);
  return { total, trustSum, hirePoints, ...rating };
}
