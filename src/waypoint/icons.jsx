// Small line-icon set standing in for pip-dots on each domino half —
// same stroke-based style as the shared portal icons, kept local since
// these render at tile scale, repeatedly, rather than once as an app icon.
const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.6",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const ICONS = {
  globe: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.8 2.2 2.8 13.8 0 16M12 4c-2.8 2.2-2.8 13.8 0 16" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M14.5 9.5 13 13l-3.5 1.5L11 11l3.5-1.5Z" />
    </>
  ),
  plane: <path d="M3 13l7-2 4-7 2 .5-2 6.5 5-1 1.5 1-6 3 .5 5-2-.5-1-3.5-4 1-.5-2Z" />,
  suitcase: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="1.6" />
      <path d="M9 8V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2M4 13h16" />
    </>
  ),
  tent: (
    <>
      <path d="M12 4l8 15H4Z" />
      <path d="M12 4v15M8.5 11.5 6 19M15.5 11.5 18 19" />
    </>
  ),
  mountain: <path d="M3 18 9 7l3.5 6L15 9l6 9Z" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.9-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.1-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </>
  ),
};

export function ValueIcon({ icon, size = 18 }) {
  return (
    <svg {...BASE} width={size} height={size} className="wp-icon" aria-hidden="true">
      {ICONS[icon]}
    </svg>
  );
}
