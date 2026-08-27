// Pure content — no rendering, no timing. A session is a small branching
// dialogue tree keyed by beat name; a beat with no `options` is terminal.
// Every `next` must point at another key in the same `beats` object —
// engine.js's dev-time integrity check (and the Node smoke test run before
// ever wiring up the UI) both walk every beat to make sure nothing dangles.

export const REPORTS = [
  { key: "maya", name: "Maya", role: "Senior Engineer" },
  { key: "devon", name: "Devon", role: "Junior Engineer" },
  { key: "priya", name: "Priya", role: "Staff Engineer" },
  { key: "sam", name: "Sam", role: "Engineer II" },
];

export const ONE_ON_ONES = [
  {
    key: "maya_load",
    reportKey: "maya",
    opener: "Maya's already got her laptop half-closed when you sit down. Good sign or bad sign — not clear yet.",
    startBeat: "start",
    beats: {
      start: {
        speaker: "Maya",
        text: "Can we keep this short? I've got a lot on my plate today.",
        options: [
          { label: "Sure — what's actually on your plate right now?", trust: 2, next: "load" },
          { label: "No problem. Quick check-in: how are you doing?", trust: 1, next: "vague" },
          { label: "This is important — let's take the time we need.", trust: -1, next: "pushback" },
        ],
      },
      load: {
        speaker: "Maya",
        text: "Honestly? Three projects at once. I'm stretched thin and I don't see it letting up.",
        options: [
          { label: "Let's figure out what comes off your plate this week.", trust: 3, morale: 2, next: "end_good" },
          { label: "You're clearly capable of handling it — I trust you.", trust: -1, next: "end_burnout" },
        ],
      },
      vague: {
        speaker: "Maya",
        text: "Fine, I guess. Same as always.",
        options: [
          { label: "“Fine” doesn't sound fine — what's really going on?", trust: 2, next: "load" },
          { label: "Good to hear. Let's talk roadmap then.", trust: -2, next: "end_missed" },
        ],
      },
      pushback: {
        speaker: "Maya",
        text: "I said I don't have time for a long one today.",
        options: [
          { label: "Fair — five minutes now, we finish properly tomorrow.", trust: 1, next: "end_recover" },
          { label: "This won't take long, I promise.", trust: -2, next: "end_missed" },
        ],
      },
      end_good: {
        speaker: null,
        text: "Maya actually looks relieved. You take one project off her plate before end of day.",
      },
      end_burnout: {
        speaker: null,
        text: "Maya nods and goes back to her desk. Three weeks later she asks for two weeks off — she's running on empty.",
        morale: -3,
      },
      end_missed: {
        speaker: null,
        text: "The 1:1 wraps on schedule. You still don't actually know how Maya's doing.",
      },
      end_recover: {
        speaker: null,
        text: "Not the conversation you planned, but Maya seems to appreciate that you noticed.",
      },
    },
  },
  {
    key: "devon_confidence",
    reportKey: "devon",
    opener: "Devon's got a doc open with bullet points prepared. They always over-prepare for these.",
    startBeat: "start",
    beats: {
      start: {
        speaker: "Devon",
        text: "Was my PR yesterday actually okay? I feel like I asked too many questions in review.",
        options: [
          { label: "Asking questions in review is exactly what I want to see.", trust: 2, next: "confidence" },
          { label: "It was fine. Let's move on to what's next.", trust: -1, next: "brushed" },
          { label: "Honestly, try to figure out more on your own first.", trust: -2, next: "deflate" },
        ],
      },
      confidence: {
        speaker: "Devon",
        text: "Okay — good. Do you think I'm ready for something bigger?",
        options: [
          { label: "Yes. I've actually got one in mind for you.", trust: 2, morale: 2, next: "end_grow" },
          { label: "Let's not rush it — one step at a time.", trust: -1, next: "end_stall" },
        ],
      },
      brushed: {
        speaker: "Devon",
        text: "Okay. (They clearly wanted more than that.)",
        options: [
          { label: "Actually — wait, let's really talk about it.", trust: 1, next: "confidence" },
          { label: "Move on to the sprint update.", trust: -1, next: "end_stall" },
        ],
      },
      deflate: {
        speaker: "Devon",
        text: "...Got it. (They close their laptop a little too fast.)",
        options: [
          { label: "That came out harsher than I meant — let me rephrase.", trust: 1, next: "end_recover" },
          { label: "Move on to the sprint update.", trust: -1, next: "end_deflated" },
        ],
      },
      end_grow: {
        speaker: null,
        text: "Devon spends the next two weeks visibly more confident in standup.",
      },
      end_stall: {
        speaker: null,
        text: "Devon's still hesitant to speak up in meetings a month later.",
      },
      end_deflated: {
        speaker: null,
        text: "Devon starts double-checking every small thing with you before doing it.",
        morale: -2,
      },
      end_recover: {
        speaker: null,
        text: "Devon relaxes a little. Still cautious, but listening.",
      },
    },
  },
  {
    key: "priya_scope",
    reportKey: "priya",
    opener: "Priya gets straight to it, like always.",
    startBeat: "start",
    beats: {
      start: {
        speaker: "Priya",
        text: "I want to lead the platform migration. I think I'm ready.",
        options: [
          { label: "Agreed — it's yours. What do you need from me?", trust: 3, next: "support" },
          { label: "Let's talk about what “ready” looks like first.", trust: -1, next: "gatekeep" },
          { label: "I was actually planning to lead that one myself.", trust: -3, next: "blocked" },
        ],
      },
      support: {
        speaker: "Priya",
        text: "Good. Then I want visibility with leadership on this — not check-ins.",
        options: [
          { label: "Done — you're the one presenting it upward.", trust: 2, morale: 2, next: "end_thrive" },
          { label: "Let's do weekly check-ins so I stay in the loop.", trust: -2, next: "end_chafe" },
        ],
      },
      gatekeep: {
        speaker: "Priya",
        text: "I've been ready for a year. What exactly are you waiting for?",
        options: [
          { label: "You're right. Let's stop waiting.", trust: 2, next: "support" },
          { label: "Let's revisit next quarter.", trust: -3, next: "end_leave_risk" },
        ],
      },
      blocked: {
        speaker: "Priya",
        text: "...Understood. (In the tone that means it isn't.)",
        options: [
          { label: "Actually — let's reconsider. Co-lead it with me?", trust: 1, next: "end_recover" },
          { label: "Hold firm on the plan.", trust: -2, next: "end_flight_risk" },
        ],
      },
      end_thrive: {
        speaker: null,
        text: "Priya delivers the migration ahead of schedule and starts getting noticed outside the team.",
      },
      end_chafe: {
        speaker: null,
        text: "Priya does the work but stops bringing you new ideas.",
        morale: -2,
      },
      end_leave_risk: {
        speaker: null,
        text: "You hear through the grapevine that Priya's taking recruiter calls.",
        morale: -3,
      },
      end_flight_risk: {
        speaker: null,
        text: "Priya's calendar quietly clears up. She's polishing her resume.",
        morale: -3,
      },
      end_recover: {
        speaker: null,
        text: "Not what Priya wanted, but she agrees it's a start.",
      },
    },
  },
  {
    key: "sam_disengaged",
    reportKey: "sam",
    opener: "Sam's on time, camera on, and says almost nothing unprompted. Same as the last few weeks.",
    startBeat: "start",
    beats: {
      start: {
        speaker: "Sam",
        text: "Fine. Same as always.",
        options: [
          { label: "You've seemed a bit checked out lately — am I reading that right?", trust: 2, next: "honest" },
          { label: "Great — anything blocking you?", trust: -1, next: "surface" },
        ],
      },
      honest: {
        speaker: "Sam",
        text: "...Yeah, okay. Honestly, the work stopped being interesting months ago.",
        options: [
          { label: "Let's find you something that isn't.", trust: 3, morale: 3, next: "end_reengage" },
          { label: "It won't always be exciting — that's the job sometimes.", trust: -2, next: "end_disengage" },
        ],
      },
      surface: {
        speaker: "Sam",
        text: "Nope, all good. (The call ends a few minutes early.)",
        options: [
          { label: "Leave it there.", trust: -1, next: "end_missed" },
          { label: "Actually — hold on, let's dig a little deeper.", trust: 1, next: "honest" },
        ],
      },
      end_reengage: {
        speaker: null,
        text: "Sam picks up a project outside their usual lane and seems genuinely into it again.",
      },
      end_disengage: {
        speaker: null,
        text: "Sam does exactly what's asked, nothing more, for the rest of the quarter.",
        morale: -2,
      },
      end_missed: {
        speaker: null,
        text: "Nothing changes. You find out later Sam interviewed elsewhere last month.",
        morale: -2,
      },
    },
  },
];

// trueQuality is never shown to the player — the debrief scores the final
// call against it after the fact, same as a real hiring decision would be
// judged in hindsight.
export const CANDIDATES = [
  {
    key: "jordan",
    name: "Jordan Lee",
    roleApplied: "Frontend Engineer",
    trueQuality: "strong",
    opener: "Jordan's hands are visibly shaky before you even start. First interview loop of the week, they mention.",
    startBeat: "start",
    beats: {
      start: {
        speaker: "Jordan",
        text: "(stumbles through the opening, then starts finding their footing) ...sorry, let me start over.",
        options: [
          { label: "Take your time — what was the hardest part of that project?", signal: 2, next: "depth" },
          { label: "Let's move quickly, we have a lot to cover.", signal: -1, next: "rushed" },
        ],
      },
      depth: {
        speaker: "Jordan",
        text: "(relaxes, goes deep on a gnarly production bug — clearly knows this cold)",
        options: [
          { label: "How did you even know where to start looking?", signal: 2, next: "final" },
          { label: "Good — let's move to the next topic.", signal: 0, next: "final" },
        ],
      },
      rushed: {
        speaker: "Jordan",
        text: "(tenses back up — answers get shorter and vaguer for the rest of the loop)",
        options: [{ label: "Continue to your assessment.", signal: 0, next: "final" }],
      },
      final: { speaker: null, text: "Time to make the call.", isFinal: true },
    },
  },
  {
    key: "alex",
    name: "Alex Rivera",
    roleApplied: "Backend Engineer",
    trueQuality: "weak",
    opener: "Alex opens with a confident, well-rehearsed intro — three years, two well-known companies.",
    startBeat: "start",
    beats: {
      start: {
        speaker: "Alex",
        text: "I led the redesign of our whole data layer. Huge impact, honestly.",
        options: [
          { label: "Walk me through the actual design, not just the outcome.", signal: 2, next: "probe" },
          { label: "Sounds impressive — tell me about the team culture there instead.", signal: -1, next: "softball" },
        ],
      },
      probe: {
        speaker: "Alex",
        text: "We really leveraged synergies across the stack to unlock scalability, you know?",
        options: [
          { label: "Get concrete — what was the actual bottleneck you fixed?", signal: 2, next: "final" },
          { label: "Sure, sounds good — moving on.", signal: 0, next: "final" },
        ],
      },
      softball: {
        speaker: "Alex",
        text: "(happily talks culture for five minutes — technical depth never comes up)",
        options: [{ label: "Continue to your assessment.", signal: -1, next: "final" }],
      },
      final: { speaker: null, text: "Time to make the call.", isFinal: true },
    },
  },
  {
    key: "noor",
    name: "Noor Khan",
    roleApplied: "Engineering Manager (internal transfer)",
    trueQuality: "strong",
    opener: "Noor's answers are short and modest, almost to a fault. Her resume undersells her, if anything.",
    startBeat: "start",
    beats: {
      start: {
        speaker: "Noor",
        text: "There was a conflict between two senior engineers once. I sorted it out.",
        options: [
          { label: "Take me through it in detail — what did you actually do?", signal: 2, next: "depth" },
          { label: "Sounds like it went fine. Next question.", signal: -2, next: "final" },
        ],
      },
      depth: {
        speaker: "Noor",
        text: "(with prompting, describes quietly defusing it in three separate 1:1s — no credit-taking, just handled it)",
        options: [
          { label: "That's exactly the judgment this role needs.", signal: 2, next: "final" },
          { label: "Good — moving on.", signal: 0, next: "final" },
        ],
      },
      final: { speaker: null, text: "Time to make the call.", isFinal: true },
    },
  },
];

export const HIRE_CALLS = [
  { key: "hire", label: "Strong hire" },
  { key: "more_time", label: "Need another round" },
  { key: "pass", label: "Pass" },
];

// hire when actually strong, or pass when actually weak, is the correct
// read; "more_time" is always the hedge — safer than a wrong call, worse
// than a right one.
export function scoreCall(trueQuality, call) {
  const correct = trueQuality === "strong" ? "hire" : "pass";
  if (call === correct) return { verdict: "good", points: 2 };
  if (call === "more_time") return { verdict: "safe", points: 1 };
  return { verdict: "bad", points: -1 };
}
