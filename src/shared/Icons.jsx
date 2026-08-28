const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "icon",
  "aria-hidden": "true",
};

export function PongIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <rect x="3" y="6" width="2" height="7" rx="1" />
      <rect x="19" y="11" width="2" height="7" rx="1" />
      <circle cx="14" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AboutIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.5 20c1.4-3.8 4.4-5.8 7.5-5.8s6.1 2 7.5 5.8" />
    </svg>
  );
}

export function PcaIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <circle cx="8" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="12.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <path d="M6 17 20 6" strokeDasharray="1.5 2.5" />
    </svg>
  );
}

export function WheelsIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8" />
    </svg>
  );
}

export function HqIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="12" cy="17" r="2.6" />
      <path d="M7.6 7.6 10.4 15M16.4 7.6 13.6 15M8.3 6h7.4" />
    </svg>
  );
}

export function ReelsIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M9.5 5v14M14.5 5v14" />
      <path d="M20.5 8.5h1.2M20.5 15.5h1.2" />
    </svg>
  );
}

export function PlotIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M12 21v-8.5" />
      <path d="M12 12.5C12 8 9 6 5.5 5.5 5.7 9.4 8 12.5 12 12.5Z" />
      <path d="M12 15C12 11.3 14.4 9.6 18 9.2 17.7 12.6 15.6 15 12 15Z" />
    </svg>
  );
}

export function GlobeIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4c2.4 2.2 3.6 5 3.6 8s-1.2 5.8-3.6 8c-2.4-2.2-3.6-5-3.6-8s1.2-5.8 3.6-8Z" />
    </svg>
  );
}

export function TickersIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M3 18l5-4 4 3 5-9 4 3" />
      <path d="M17 9h4v4" />
    </svg>
  );
}

export function VineIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M4 20c3-1 3-4 6-5s3-4 6-5 3-4 4-4" />
      <circle cx="20" cy="6" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RicochetIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <rect x="4" y="5" width="4.5" height="2.6" rx="0.6" />
      <rect x="9.5" y="5" width="4.5" height="2.6" rx="0.6" />
      <rect x="15" y="5" width="4.5" height="2.6" rx="0.6" />
      <circle cx="12" cy="14" r="1.6" fill="currentColor" stroke="none" />
      <rect x="8" y="19" width="8" height="2" rx="1" />
    </svg>
  );
}

export function VolfiedIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <path d="M3 8h6v6H3" />
      <circle cx="16" cy="15" r="2.4" />
      <path d="M13 6l1.4 1.4" />
    </svg>
  );
}

export function SalvoIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M8 6h2v2H8zM14 6h2v2h-2zM6 8h12v4H6zM8 12h2v2H8zM14 12h2v2h-2z" fill="currentColor" stroke="none" />
      <path d="M11 16v3M8 20h8" />
    </svg>
  );
}

export function WickIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M12 3.2c1.4 1.8 2.1 3.1 2.1 4.1a2.1 2.1 0 1 1-4.2 0c0-1 .7-2.3 2.1-4.1Z" />
      <path d="M12 7.3v3.7" />
      <rect x="9.2" y="11" width="5.6" height="8.5" rx="1" />
      <path d="M9.2 14.8h5.6" />
    </svg>
  );
}

export function BarrageIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M3 13h5l2-2h7" />
      <path d="M17 11h3" />
      <path d="M6 13v4M9 13v4" />
      <path d="M12 11V8" />
      <path d="M20 8l1.4-1.4M21.5 11h2M20 14l1.4 1.4" />
    </svg>
  );
}

export function RedlineIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <rect x="9" y="4" width="6" height="14" rx="2" />
      <path d="M9 8.5h6M9 13.5h6" />
      <path d="M6.5 9v3M17.5 9v3" />
      <path d="M12 20v1.5" />
    </svg>
  );
}

export function CrossingIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <ellipse cx="12" cy="13" rx="6" ry="5" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
      <path d="M6 10l-3-2M18 10l3-2M6 16l-2 3M18 16l2 3" />
    </svg>
  );
}

export function SwarmIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M5 5h3v3H5zM10.5 5h3v3h-3zM16 5h3v3h-3z" fill="currentColor" stroke="none" />
      <path d="M12 8c0 4-4 5-4 9" />
      <path d="M6.5 19.5l1.5-2.5 2.5 1" />
    </svg>
  );
}

export function BackofficeIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <rect x="3.5" y="4" width="17" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
      <path d="M7 12l2.5-3L12 11l2.5-4L17 10" />
    </svg>
  );
}

export function ShatterIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M12 3l7 4.2v9.6L12 21l-7-4.2V7.2Z" />
      <path d="M12 3v7M12 10l-5 2M12 10l5.5 1.5M12 10l-1 8" />
    </svg>
  );
}

export function ComboIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M4 11h5v5H4zM10 11h5v5h-5zM10 5h5v5h-5z" />
    </svg>
  );
}

export function NibbleIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M12 3a9 9 0 1 0 9 9L12 12Z" />
      <circle cx="12" cy="9" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RosterIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M4 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3 3v-3H6a2 2 0 0 1-2-2V6Z" />
      <path d="M20 12v3a2 2 0 0 1-2 2h-1v3l-3-3h-2" />
    </svg>
  );
}
