const YELLOW = "#f0c443";
const TEAL = "#4fd3c4";
export const ORANGE = "#e0682a";

function Sparkle({ x, y, size = 2.4, color = "#fff" }) {
  return (
    <g>
      <rect x={x - size / 6} y={y - size / 2} width={size / 3} height={size} fill={color} opacity="0.95" />
      <rect x={x - size / 2} y={y - size / 6} width={size} height={size / 3} fill={color} opacity="0.95" />
    </g>
  );
}

export function SquareSymbol({ size = 36, xp = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      {xp && <rect x="0" y="0" width="12" height="12" fill="#241033" />}
      {xp && <Sparkle x={2.2} y={2.2} size={2.2} />}
      {xp && <Sparkle x={9.8} y={9.8} size={2.2} />}
      <rect x="2.3" y="2.3" width="7.4" height="7.4" fill={YELLOW} stroke="#7a4a10" strokeWidth="0.7" />
      <rect x="3.6" y="3.6" width="4.8" height="4.8" fill="none" stroke="#7a4a10" strokeWidth="0.4" opacity="0.5" />
    </svg>
  );
}

export function DiamondSymbol({ size = 36, xp = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      {xp && <rect x="0" y="0" width="12" height="12" fill="#241033" />}
      {xp && <Sparkle x={2.2} y={2.2} size={2.2} />}
      {xp && <Sparkle x={9.8} y={9.8} size={2.2} />}
      <polygon points="6,1 11,6 6,11 1,6" fill={TEAL} stroke="#0f5c52" strokeWidth="0.7" />
      <polygon points="6,3 8.6,6 6,9 3.4,6" fill="none" stroke="#0f5c52" strokeWidth="0.4" opacity="0.5" />
    </svg>
  );
}

export function HammerSymbol({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="5.1" y="4.5" width="1.8" height="6.5" fill="#8a5a2f" stroke="#4a2f18" strokeWidth="0.3" />
      <rect x="1.8" y="1" width="8.4" height="4" fill="#b8bec4" stroke="#3d4043" strokeWidth="0.6" />
      <rect x="1.8" y="1" width="8.4" height="1.2" fill="#d9dde0" />
    </svg>
  );
}

export function BlankSymbol({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="4" y="4" width="4" height="4" fill="none" stroke="#6b5a44" strokeWidth="0.6" opacity="0.5" />
    </svg>
  );
}

export function ChargeIcon({ size = 12, color = "#f0c443" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="5.2" y="1" width="1.6" height="6.4" fill={color} stroke="#7a4a10" strokeWidth="0.3" />
      <polygon points="3,7 9,7 6,11.2" fill={color} stroke="#7a4a10" strokeWidth="0.3" />
      <rect x="3.6" y="7" width="4.8" height="1.1" fill="#8a5a2f" />
    </svg>
  );
}

export function TowerIcon({ size = 12, color = "#f0c443" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="5.1" y="0.8" width="1.8" height="2.4" fill={color} />
      <polygon points="2,5.4 6,3 10,5.4 10,7 2,7" fill={color} stroke="#7a4a10" strokeWidth="0.3" />
      <rect x="1.2" y="7" width="9.6" height="1.6" fill={color} stroke="#7a4a10" strokeWidth="0.3" />
      <rect x="2.4" y="9" width="7.2" height="2.2" fill="none" stroke={color} strokeWidth="0.9" opacity="0.85" />
    </svg>
  );
}

const HERO_GLYPHS = {
  warrior: (
    <svg viewBox="0 0 14 16" shapeRendering="crispEdges">
      <circle cx="7" cy="3" r="2" fill="#e0b088" />
      <rect x="4.5" y="5" width="5" height="6" fill="#8a2f2f" stroke="#4a1414" strokeWidth="0.3" />
      <rect x="6.3" y="0.5" width="1.4" height="9" fill="#c9ccd1" />
      <rect x="4.6" y="4.3" width="4.8" height="1.4" fill="#c9ccd1" />
      <rect x="4.5" y="11" width="2" height="4" fill="#5a3a20" />
      <rect x="7.5" y="11" width="2" height="4" fill="#5a3a20" />
    </svg>
  ),
  mage: (
    <svg viewBox="0 0 14 16" shapeRendering="crispEdges">
      <circle cx="7" cy="3" r="2" fill="#e0b088" />
      <polygon points="7,5 11,15 3,15" fill="#3a4a8a" stroke="#1a2450" strokeWidth="0.3" />
      <rect x="9.5" y="2" width="1.2" height="11" fill="#8a5a2f" />
      <circle cx="10.1" cy="1.6" r="1.6" fill="#8ec9ff" stroke="#2a5c8a" strokeWidth="0.4" />
    </svg>
  ),
  archer: (
    <svg viewBox="0 0 14 16" shapeRendering="crispEdges">
      <circle cx="7" cy="3" r="2" fill="#e0b088" />
      <rect x="5" y="5" width="4" height="6" fill="#3a6b3a" stroke="#1a3a1a" strokeWidth="0.3" />
      <rect x="5" y="11" width="1.8" height="4" fill="#4a3420" />
      <rect x="7.2" y="11" width="1.8" height="4" fill="#4a3420" />
      <path d="M11,2 Q13.5,7.5 11,13" fill="none" stroke="#8a5a2f" strokeWidth="1" />
      <line x1="11" y1="2.3" x2="11" y2="12.7" stroke="#d9dde0" strokeWidth="0.4" />
    </svg>
  ),
  engineer: (
    <svg viewBox="0 0 14 16" shapeRendering="crispEdges">
      <circle cx="7" cy="3" r="2" fill="#e0b088" />
      <rect x="4.5" y="5" width="5" height="6" fill="#b8862f" stroke="#5c3f14" strokeWidth="0.3" />
      <rect x="4.5" y="11" width="2" height="4" fill="#4a3420" />
      <rect x="7.5" y="11" width="2" height="4" fill="#4a3420" />
      <circle cx="10.5" cy="9" r="2.3" fill="none" stroke="#c9ccd1" strokeWidth="1.3" />
      <rect x="9.9" y="6.2" width="1.2" height="1.4" fill="#c9ccd1" />
    </svg>
  ),
  assassin: (
    <svg viewBox="0 0 14 16" shapeRendering="crispEdges">
      <circle cx="7" cy="3" r="2" fill="#c9a888" />
      <rect x="4.7" y="5" width="4.6" height="6" fill="#2a2a30" stroke="#000" strokeWidth="0.3" />
      <rect x="4.7" y="11" width="2" height="4" fill="#2a2a30" />
      <rect x="7.3" y="11" width="2" height="4" fill="#2a2a30" />
      <polygon points="11,3 12,7 11,9.5 10,7" fill="#c9ccd1" stroke="#3d4043" strokeWidth="0.3" />
    </svg>
  ),
  priest: (
    <svg viewBox="0 0 14 16" shapeRendering="crispEdges">
      <circle cx="7" cy="3" r="2" fill="#e0b088" />
      <polygon points="7,5 10.5,15 3.5,15" fill="#e8d9a0" stroke="#8a7a3a" strokeWidth="0.3" />
      <rect x="6.2" y="7" width="1.6" height="4.5" fill="#c9944a" />
      <rect x="4.8" y="8.4" width="4.4" height="1.4" fill="#c9944a" />
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
