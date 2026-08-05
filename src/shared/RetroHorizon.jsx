import { PERIODS } from "./periods.js";
import { useDayFraction, useTimeOfDay } from "./useTimeOfDay.js";
import "./retroHorizon.css";

export function RetroHorizon() {
  const period = useTimeOfDay();
  const fraction = useDayFraction();
  const p = PERIODS[period];

  // Arcs the sun/moon across the sky using the real time of day, independent
  // of which of the 4 mood buckets is currently active.
  const arc = Math.sin(fraction * Math.PI);
  const sunTop = 62 - arc * 46;
  const sunLeft = fraction * 100;

  return (
    <div className="retro-horizon" style={{ "--grid-color": p.grid }}>
      <div
        className="retro-sky"
        style={{ background: `linear-gradient(to bottom, ${p.sky.join(", ")})` }}
      />
      <div
        className="retro-sun"
        style={{
          top: `${sunTop}%`,
          left: `${sunLeft}%`,
          background: p.sun,
          boxShadow: `0 0 60px 20px ${p.sunGlow}, 0 0 140px 60px ${p.sunGlow}`,
        }}
      />
      <div className="retro-grid" />
      <div className="retro-horizon-line" style={{ boxShadow: `0 0 30px 4px ${p.sunGlow}` }} />
    </div>
  );
}
