// Generates a 10-step Mantine color ramp (light -> dark) from a single hue,
// so each time-of-day theme only needs to specify a hue/saturation pair
// instead of ten hand-picked hex codes.
export function hslShades(hue, sat) {
  const lightness = [95, 88, 78, 68, 58, 50, 44, 37, 29, 20];
  return lightness.map((l) => `hsl(${hue}, ${sat}%, ${l}%)`);
}
