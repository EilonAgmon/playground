// A pink birthday crown with lit candles, drawn in SVG so it stays crisp at
// any size. Kept refined (no outlines, metallic shading, small pearls) so
// it reads as jewellery, while the candles make it a birthday crown.
// Placed over the main photo by .nuts-crown in nuts_b_day.css.

// Candles stand inside the crown, rising from behind the band.
const CANDLES = [
  { x: 24, top: 36, stripe: "#d9a441" },
  { x: 47, top: 22, stripe: "#f2a7c3" },
  { x: 73, top: 22, stripe: "#f2a7c3" },
  { x: 96, top: 36, stripe: "#d9a441" },
];

// Crown points (tip x, tip y) and the valleys between them sit on y = 52.
const TIPS = [
  [10, 40],
  [35, 32],
  [60, 26],
  [85, 32],
  [110, 40],
];

const crownBody =
  "M8 66 L10 40 L22 52 L35 32 L47 52 L60 26 L73 52 L85 32 L98 52 L110 40 L112 66 Q60 74 8 66 Z";

export default function Crown({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 80" aria-hidden="true">
      <defs>
        {/* Horizontal banding fakes a curved, polished metal surface. */}
        <linearGradient id="bc-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a8325f" />
          <stop offset="0.16" stopColor="#ffb3cc" />
          <stop offset="0.3" stopColor="#ea6b98" />
          <stop offset="0.5" stopColor="#ffe3ec" />
          <stop offset="0.7" stopColor="#ea6b98" />
          <stop offset="0.84" stopColor="#ff9fbf" />
          <stop offset="1" stopColor="#952a52" />
        </linearGradient>
        <linearGradient id="bc-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#4a0f28" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="bc-candle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9cdb8" />
          <stop offset="0.45" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#cfc1a8" />
        </linearGradient>
        <radialGradient id="bc-flame" cx="0.5" cy="0.7" r="0.6">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.35" stopColor="#ffd56b" />
          <stop offset="0.75" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bc-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bc-pearl" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f1ebe1" />
          <stop offset="1" stopColor="#b9ad9a" />
        </radialGradient>
        <radialGradient id="bc-stone" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#f6d6e4" />
          <stop offset="1" stopColor="#a3577a" />
        </radialGradient>
      </defs>

      {/* Candles, behind the crown so their bases disappear into it. */}
      {CANDLES.map((c) => (
        <g key={c.x}>
          <circle cx={c.x} cy={c.top - 6} r="9" fill="url(#bc-glow)" />
          <rect x={c.x - 2.2} y={c.top} width="4.4" height={60 - c.top} rx="1" fill="url(#bc-candle)" />
          {/* Thin spiral stripes */}
          {Array.from({ length: Math.floor((60 - c.top) / 5) }, (_, i) => (
            <path
              key={i}
              d={`M${c.x - 2.2} ${c.top + 3 + i * 5} L${c.x + 2.2} ${c.top + 1 + i * 5}`}
              stroke={c.stripe}
              strokeWidth="1.1"
            />
          ))}
          <path d={`M${c.x} ${c.top} L${c.x} ${c.top - 2}`} stroke="#3a2a1a" strokeWidth="0.6" />
          <path
            className="nuts-crown-flame"
            d={`M${c.x} ${c.top - 11} C${c.x + 3.2} ${c.top - 6.5}, ${c.x + 2.4} ${c.top - 1.6}, ${c.x} ${c.top - 1.6} C${c.x - 2.4} ${c.top - 1.6}, ${c.x - 3.2} ${c.top - 6.5}, ${c.x} ${c.top - 11} Z`}
            fill="url(#bc-flame)"
          />
        </g>
      ))}

      {/* Crown body: polished gold points, no outline. */}
      <path d={crownBody} fill="url(#bc-metal)" />
      <path d={crownBody} fill="url(#bc-shade)" />

      {/* Band: a slightly darker curved strip with a fine highlight. */}
      <path d="M8 58 Q60 66 112 58 L112 66 Q60 74 8 66 Z" fill="url(#bc-metal)" />
      <path d="M8 58 Q60 66 112 58 L112 66 Q60 74 8 66 Z" fill="#4a0f28" opacity="0.12" />
      <path d="M9 58.6 Q60 66.4 111 58.6" fill="none" stroke="#fff0f6" strokeOpacity="0.8" strokeWidth="0.7" />

      {/* Pearls on the points, seed pearls on the band, one stone in front. */}
      {TIPS.map(([x, y]) => (
        <circle key={x} cx={x} cy={y - 1.8} r="2.4" fill="url(#bc-pearl)" />
      ))}
      {[18, 30, 42, 78, 90, 102].map((x) => (
        <circle key={x} cx={x} cy={62.4 + 4 * (1 - ((x - 60) / 52) ** 2)} r="1.2" fill="url(#bc-pearl)" />
      ))}
      <ellipse cx="60" cy="66" rx="3.4" ry="4" fill="url(#bc-stone)" />
      <ellipse cx="59" cy="64.6" rx="1" ry="1.3" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}
