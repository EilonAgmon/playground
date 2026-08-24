import { PERIODS } from "./periods.js";
import { useTimeOfDay } from "./useTimeOfDay.js";
import "./ambiance.css";

export function Ambiance() {
  const period = useTimeOfDay();
  const p = PERIODS[period];

  return (
    <div className="ambiance">
      <div className="ambiance-blob ambiance-blob-gold" style={{ background: `radial-gradient(circle, hsl(${p.hue} 60% 58%) 0%, transparent 70%)` }} />
      <div className="ambiance-blob ambiance-blob-plum" />
      <div className="ambiance-blob ambiance-blob-sage" />
    </div>
  );
}
