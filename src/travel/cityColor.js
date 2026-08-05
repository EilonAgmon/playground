// Deterministic gradient per city name, so the same place always looks the
// same across visits without needing real photos.
export function cityGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 55) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 32%), hsl(${hue2}, 75%, 18%))`;
}
