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
    hue: 32,
    sat: 55,
    sky: ["hsl(280, 35%, 10%)", "hsl(320, 32%, 15%)", "hsl(350, 38%, 22%)", "hsl(20, 48%, 26%)", "hsl(32, 50%, 30%)"],
    sun: "#f3c877",
    sunGlow: "rgba(243, 200, 119, 0.55)",
    silhouette: "rgba(28, 18, 28, 0.65)",
    bg: "#1a1224",
  },
  day: {
    label: "day",
    hue: 95,
    sat: 38,
    sky: ["hsl(100, 32%, 11%)", "hsl(95, 30%, 15%)", "hsl(90, 28%, 21%)", "hsl(75, 26%, 25%)", "hsl(60, 30%, 30%)"],
    sun: "#fff6d8",
    sunGlow: "rgba(255, 246, 216, 0.5)",
    silhouette: "rgba(18, 26, 16, 0.6)",
    bg: "#1c2519",
  },
  dusk: {
    label: "dusk",
    hue: 355,
    sat: 55,
    sky: ["hsl(320, 58%, 6%)", "hsl(340, 58%, 10%)", "hsl(355, 55%, 17%)", "hsl(15, 55%, 24%)", "hsl(30, 65%, 30%)"],
    sun: "#e8763f",
    sunGlow: "rgba(232, 118, 63, 0.6)",
    silhouette: "rgba(14, 6, 10, 0.65)",
    bg: "#150810",
  },
  night: {
    label: "night",
    hue: 38,
    sat: 45,
    sky: ["#000000", "#050510", "#0d0d22", "#151530", "#1f1f3d"],
    sun: "#ffb14d",
    sunGlow: "rgba(255, 177, 77, 0.5)",
    silhouette: "rgba(0, 0, 0, 0.75)",
    bg: "#000000",
  },
};

export const PERIODS = Object.fromEntries(
  Object.entries(RAW).map(([key, p]) => {
    const shades = hslShades(p.hue, p.sat);
    return [key, { ...p, shades, accent: shades[4] }];
  })
);
