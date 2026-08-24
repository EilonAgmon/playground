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

export function TravelIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M12 21c4-4.2 7-8 7-11.5A7 7 0 0 0 5 9.5C5 13 8 16.8 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
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

export function TerminalIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M7 10l3 2.5L7 15" />
      <path d="M12.5 15h4.5" />
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

export function BackofficeIcon({ size = 24 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <rect x="3.5" y="4" width="17" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
      <path d="M7 12l2.5-3L12 11l2.5-4L17 10" />
    </svg>
  );
}
