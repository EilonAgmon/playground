const YELLOW = "#e0b23c";
const TEAL = "#3fb6a8";

function Star({ x, y, size = 2.4, color = "#fff" }) {
  return (
    <g>
      <rect x={x - size / 6} y={y - size / 2} width={size / 3} height={size} fill={color} opacity="0.9" />
      <rect x={x - size / 2} y={y - size / 6} width={size} height={size / 3} fill={color} opacity="0.9" />
    </g>
  );
}

export function SquareSymbol({ size = 36, xp = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="0" y="0" width="12" height="12" fill={xp ? "#1a2340" : "transparent"} />
      {xp && <Star x={2.2} y={2.2} size={2.2} />}
      {xp && <Star x={9.8} y={9.8} size={2.2} />}
      <rect x="2.5" y="2.5" width="7" height="7" fill={YELLOW} stroke="#5c4413" strokeWidth="0.6" />
    </svg>
  );
}

export function DiamondSymbol({ size = 36, xp = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="0" y="0" width="12" height="12" fill={xp ? "#1a2340" : "transparent"} />
      {xp && <Star x={2.2} y={2.2} size={2.2} />}
      {xp && <Star x={9.8} y={9.8} size={2.2} />}
      <polygon points="6,1.5 10.5,6 6,10.5 1.5,6" fill={TEAL} stroke="#123b36" strokeWidth="0.6" />
    </svg>
  );
}

export function HammerSymbol({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="5" y="4" width="2" height="7" fill="#8a5a2f" />
      <rect x="2" y="1" width="8" height="3.5" fill="#9aa0a6" stroke="#3d4043" strokeWidth="0.5" />
    </svg>
  );
}

export function CrownIcon({ size = 40, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden="true">
      <polygon points="1,11 1,5 4.5,7.5 8,3 11.5,7.5 15,5 15,11" fill={color} stroke="#5c4413" strokeWidth="0.5" />
      <rect x="1" y="10.5" width="14" height="1.2" fill={color} />
    </svg>
  );
}

const HERO_GLYPHS = {
  warrior: (
    <svg viewBox="0 0 12 12" shapeRendering="crispEdges">
      <rect x="5.2" y="1" width="1.6" height="7" fill="#cfd4d8" />
      <rect x="3" y="7.4" width="6" height="1.4" fill="#8a5a2f" />
      <rect x="5.2" y="8.6" width="1.6" height="2.4" fill="#5c4413" />
    </svg>
  ),
  mage: (
    <svg viewBox="0 0 12 12" shapeRendering="crispEdges">
      <rect x="5.4" y="3" width="1.2" height="8" fill="#8a5a2f" />
      <circle cx="6" cy="2.4" r="2" fill="#8ec9ff" stroke="#2a5c8a" strokeWidth="0.5" />
    </svg>
  ),
  archer: (
    <svg viewBox="0 0 12 12" shapeRendering="crispEdges">
      <path d="M3,1.5 Q1,6 3,10.5" fill="none" stroke="#8a5a2f" strokeWidth="1.1" />
      <line x1="3" y1="1.7" x2="3" y2="10.3" stroke="#cfd4d8" strokeWidth="0.5" />
      <line x1="1.5" y1="6" x2="10.5" y2="6" stroke="#cfd4d8" strokeWidth="0.7" />
      <polygon points="10.5,6 8.7,5.2 8.7,6.8" fill="#cfd4d8" />
    </svg>
  ),
  engineer: (
    <svg viewBox="0 0 12 12" shapeRendering="crispEdges">
      <rect x="2" y="7.5" width="8" height="1.6" fill="#9aa0a6" transform="rotate(-35 6 8.3)" />
      <circle cx="8.3" cy="3.2" r="2.1" fill="none" stroke="#9aa0a6" strokeWidth="1.3" />
    </svg>
  ),
  assassin: (
    <svg viewBox="0 0 12 12" shapeRendering="crispEdges">
      <polygon points="6,1 7.2,6 6,8 4.8,6" fill="#cfd4d8" stroke="#3d4043" strokeWidth="0.4" />
      <rect x="5.3" y="8" width="1.4" height="3" fill="#5c4413" />
    </svg>
  ),
  priest: (
    <svg viewBox="0 0 12 12" shapeRendering="crispEdges">
      <rect x="5.1" y="1.5" width="1.8" height="9" fill="#e8d9a0" stroke="#8a7a3a" strokeWidth="0.3" />
      <rect x="2.5" y="4.2" width="7" height="1.8" fill="#e8d9a0" stroke="#8a7a3a" strokeWidth="0.3" />
    </svg>
  ),
};

export function HeroGlyph({ heroKey, size = 32 }) {
  return (
    <div style={{ width: size, height: size, display: "inline-flex" }} aria-hidden="true">
      {HERO_GLYPHS[heroKey]}
    </div>
  );
}
