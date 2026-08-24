import { CONTACT, SUMMARY, EXPERIENCE, EDUCATION, ARMY } from "../about/resumeData.js";

const SKILLS = [
  "Engineering leadership — hiring, mentoring, and scaling 4→45 person orgs",
  "Live-service product delivery — roadmap, budget, and cross-team execution",
  "Gaming & SaaS platforms — slots, live-ops, and B2B professional tools",
  "Legacy-to-modern migrations — Ruby→Node/React, Java Swing→web",
  "AI-assisted engineering workflows — Claude, Copilot, Cursor",
];

const HELP_LINES = [
  "available commands:",
  "  whoami         who is this",
  "  experience     work history",
  "  skills         what I actually do",
  "  education      degrees",
  "  army           military service",
  "  contact        how to reach me",
  "  ls games/      see the games on this site",
  "  sudo hire-me   ...",
  "  about          open the full resume page",
  "  portal         back to the portal",
  "  clear          clear the screen",
  "  help           show this again",
];

function experienceLines() {
  const lines = [];
  EXPERIENCE.forEach((job) => {
    lines.push(`${job.role} — ${job.company} (${job.dates})`);
    job.bullets.forEach(([label, text]) => {
      lines.push(`  ${label ? label + ": " : ""}${text}`);
    });
    lines.push("");
  });
  return lines;
}

export function runCommand(raw) {
  const cmd = raw.trim();
  const lower = cmd.toLowerCase();

  if (lower === "") return { lines: [] };
  if (lower === "help") return { lines: HELP_LINES };
  if (lower === "clear") return { lines: [], clear: true };
  if (lower === "whoami") return { lines: [SUMMARY] };
  if (lower === "experience") return { lines: experienceLines() };
  if (lower === "skills") return { lines: SKILLS };
  if (lower === "education") {
    return {
      lines: EDUCATION.map((e) => `${e.degree} — ${e.school} (${e.dates})${e.detail ? " — " + e.detail : ""}`),
    };
  }
  if (lower === "army") return { lines: ARMY.map((a) => `${a.role} — ${a.detail} (${a.dates})`) };
  if (lower === "contact") {
    return {
      lines: [`email  ${CONTACT.email}`, `phone  ${CONTACT.phone}`, `based  ${CONTACT.location}`],
    };
  }
  if (lower === "ls" || lower === "ls games/" || lower === "ls games") {
    return { lines: ["hq/", "wheels/", "reels/", "pong/", "plot/", "globe/", "pca/"] };
  }
  if (lower === "sudo hire-me") {
    return {
      lines: ["[sudo] password for visitor: ********", "permission granted.", `→ mailto:${CONTACT.email}`],
    };
  }
  if (lower === "about" || lower === "cd about") return { lines: ["opening the full resume…"], navigate: "../about/" };
  if (lower === "portal" || lower === "cd .." || lower === "exit") {
    return { lines: ["heading back to the portal…"], navigate: "../" };
  }

  return { lines: [`command not found: ${cmd}`, "type 'help' for a list of commands"] };
}
