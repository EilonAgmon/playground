import { useMemo, useState } from "react";
import { COUNTRY_COORDS } from "./coords.js";

// Plain equirectangular projection (no coastline data at all — see the note
// in countries.js about why: a real coastline dataset needs a sourced,
// licensed geometry file, so instead of faking one this leans into a
// nautical-chart look: graticule lines, pins, nothing pretending to be a
// shoreline that isn't actually there).
const VB_W = 1000;
const VB_H = 500;

function project([lat, lon]) {
  const x = ((lon + 180) / 360) * VB_W;
  const y = ((90 - lat) / 180) * VB_H;
  return [x, y];
}

// Greedy nearest-neighbor tour over visited pins — not a claim about the
// order they were actually visited, just a pleasant single "footprint"
// line connecting everything you've marked instead of an illegible tangle.
function footprintPath(points) {
  if (points.length < 2) return points;
  const remaining = points.slice();
  const path = [remaining.shift()];
  while (remaining.length) {
    const last = path[path.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = (p.x - last.x) ** 2 + (p.y - last.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    path.push(remaining.splice(bestIdx, 1)[0]);
  }
  return path;
}

const MERIDIANS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const PARALLELS = [-60, -30, 0, 30, 60];

export default function RouteMap({ countries, status, onToggle }) {
  const [hovered, setHovered] = useState(null);

  const pins = useMemo(() => {
    return countries
      .filter((c) => status[c.code] === "visited" || status[c.code] === "wishlist")
      .map((c) => {
        const coord = COUNTRY_COORDS[c.code];
        if (!coord) return null;
        const [x, y] = project(coord);
        return { code: c.code, name: c.name, status: status[c.code], x, y };
      })
      .filter(Boolean);
  }, [countries, status]);

  const footprint = useMemo(() => footprintPath(pins.filter((p) => p.status === "visited")), [pins]);

  const hoveredPin = pins.find((p) => p.code === hovered);

  return (
    <div className="globe-map-wrap surface fade-up">
      <svg className="globe-map" viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label="Map of visited and wishlist countries">
        <rect x="0" y="0" width={VB_W} height={VB_H} className="globe-map-bg" />

        {MERIDIANS.map((lon) => {
          const [x] = project([0, lon]);
          return (
            <line
              key={`m${lon}`}
              x1={x}
              y1={0}
              x2={x}
              y2={VB_H}
              className={lon === 0 ? "globe-graticule globe-graticule-main" : "globe-graticule"}
            />
          );
        })}
        {PARALLELS.map((lat) => {
          const [, y] = project([lat, 0]);
          return (
            <line
              key={`p${lat}`}
              x1={0}
              y1={y}
              x2={VB_W}
              y2={y}
              className={lat === 0 ? "globe-graticule globe-graticule-main" : "globe-graticule"}
            />
          );
        })}

        {footprint.length > 1 && (
          <polyline
            className="globe-footprint"
            points={footprint.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
          />
        )}

        {pins.map((p) => (
          <g key={p.code}>
            <circle
              cx={p.x}
              cy={p.y}
              r="9"
              className="globe-pin-hit"
              onPointerEnter={() => setHovered(p.code)}
              onPointerLeave={() => setHovered((h) => (h === p.code ? null : h))}
              onClick={() => onToggle(p.code)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={p.status === "visited" ? 3.4 : 3.2}
              className={`globe-pin globe-pin-${p.status}`}
            />
          </g>
        ))}
      </svg>

      {hoveredPin && (
        <div
          className="globe-map-tooltip"
          style={{ left: `${(hoveredPin.x / VB_W) * 100}%`, top: `${(hoveredPin.y / VB_H) * 100}%` }}
        >
          {hoveredPin.name}
        </div>
      )}

      <div className="globe-map-legend">
        <span>
          <i className="globe-pin globe-pin-visited" /> visited
        </span>
        <span>
          <i className="globe-pin globe-pin-wishlist" /> wishlist
        </span>
        {pins.length === 0 && <span className="globe-map-hint">Mark a country below to place your first pin.</span>}
      </div>
    </div>
  );
}
