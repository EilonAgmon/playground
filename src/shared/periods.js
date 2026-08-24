import { hslShades } from "./colorShades.js";

export function getTimeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

// Every period sits close to the signature gold accent (hue ~28-42) — this
// is meant to be a subtle "living site" touch, not a theme swap. The
// Ambiance blob reads `hue` to nudge its own tint across the day.
const RAW = {
  dawn: { label: "dawn", hue: 26, sat: 58 },
  day: { label: "day", hue: 38, sat: 45 },
  dusk: { label: "dusk", hue: 22, sat: 60 },
  night: { label: "night", hue: 40, sat: 38 },
};

export const PERIODS = Object.fromEntries(
  Object.entries(RAW).map(([key, p]) => {
    const shades = hslShades(p.hue, p.sat);
    return [key, { ...p, shades, accent: shades[4] }];
  })
);
