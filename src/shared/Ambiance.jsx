import { PERIODS } from "./periods.js";
import { useDayFraction, useTimeOfDay } from "./useTimeOfDay.js";
import "./ambiance.css";

// A crenellated castle-parapet skyline, built as a clip-path polygon so it
// stays crisp at any size without an image asset.
function battlementsClipPath(teeth = 14, merlonY = 0, crenelY = 45) {
  const unit = 100 / teeth;
  const points = ["0% 100%"];
  for (let i = 0; i < teeth; i++) {
    const x0 = (i * unit).toFixed(2);
    const x1 = ((i + 1) * unit).toFixed(2);
    const y = i % 2 === 0 ? merlonY : crenelY;
    points.push(`${x0}% ${y}%`, `${x1}% ${y}%`);
  }
  points.push("100% 100%");
  return `polygon(${points.join(", ")})`;
}

const CASTLE_CLIP = battlementsClipPath();

export function Ambiance() {
  const period = useTimeOfDay();
  const fraction = useDayFraction();
  const p = PERIODS[period];

  const arc = Math.sin(fraction * Math.PI);
  const glowTop = 58 - arc * 40;
  const glowLeft = fraction * 100;

  return (
    <div className="ambiance">
      <div className="ambiance-sky" style={{ background: `linear-gradient(to bottom, ${p.sky.join(", ")})` }} />
      <div
        className="ambiance-skyglow"
        style={{ top: `${glowTop}%`, left: `${glowLeft}%`, background: p.sun, boxShadow: `0 0 90px 30px ${p.sunGlow}` }}
      />
      <div className="ambiance-castle" style={{ clipPath: CASTLE_CLIP, background: p.silhouette }} />
      <div className="ambiance-torch ambiance-torch-left" style={{ background: p.sunGlow }} />
      <div className="ambiance-torch ambiance-torch-right" style={{ background: p.sunGlow }} />
    </div>
  );
}
