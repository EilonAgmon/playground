import { hslShades } from "./colorShades.js";

export function getTimeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

const RAW = {
  dawn: {
    label: "dawn",
    hue: 22,
    sat: 88,
    sky: ["#1a1033", "#4a2545", "#c95d63", "#f0a868", "#ffd9a0"],
    sun: "#ffd27a",
    sunGlow: "rgba(255, 200, 130, 0.65)",
    grid: "rgba(255, 170, 120, 0.4)",
    bg: "#150e1f",
  },
  day: {
    label: "day",
    hue: 195,
    sat: 85,
    sky: ["#001b3d", "#0a3d6b", "#1a7fb8", "#4fc3e8", "#bdf3ff"],
    sun: "#fffbe0",
    sunGlow: "rgba(255, 255, 220, 0.75)",
    grid: "rgba(100, 220, 255, 0.4)",
    bg: "#001529",
  },
  dusk: {
    label: "dusk",
    hue: 322,
    sat: 85,
    sky: ["#0d0221", "#2b0f4f", "#7c1f7a", "#d9457a", "#ff9d5c"],
    sun: "#ff6ec7",
    sunGlow: "rgba(255, 110, 199, 0.7)",
    grid: "rgba(255, 90, 180, 0.45)",
    bg: "#0d0620",
  },
  night: {
    label: "night",
    hue: 150,
    sat: 80,
    sky: ["#000000", "#020805", "#031a10", "#04321d", "#0a4d2a"],
    sun: "#39ff88",
    sunGlow: "rgba(57, 255, 136, 0.55)",
    grid: "rgba(57, 255, 136, 0.35)",
    bg: "#000000",
  },
};

export const PERIODS = Object.fromEntries(
  Object.entries(RAW).map(([key, p]) => {
    const shades = hslShades(p.hue, p.sat);
    return [key, { ...p, shades, accent: shades[4] }];
  })
);
