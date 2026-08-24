function Badge({ bg, children }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill={bg} />
      <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5" />
      {children}
    </svg>
  );
}

export function WheatSymbol() {
  return (
    <Badge bg="#e9c77e">
      <g stroke="#7a5220" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M20 30V13" />
        <path d="M20 15l-5 -4M20 15l5 -4" />
        <path d="M20 19l-5 -4M20 19l5 -4" />
        <path d="M20 23l-5 -4M20 23l5 -4" />
      </g>
      <circle cx="20" cy="10" r="2.6" fill="#7a5220" />
    </Badge>
  );
}

export function SunSymbol() {
  return (
    <Badge bg="#f3c877">
      <circle cx="20" cy="20" r="7" fill="#c9781f" />
      <g stroke="#c9781f" strokeWidth="2" strokeLinecap="round">
        <path d="M20 5v4M20 31v4M5 20h4M31 20h4M9.5 9.5l2.8 2.8M27.7 27.7l2.8 2.8M30.5 9.5l-2.8 2.8M12.3 27.7l-2.8 2.8" />
      </g>
    </Badge>
  );
}

export function TractorSymbol() {
  return (
    <Badge bg="#8fae7a">
      <rect x="9" y="16" width="13" height="7" rx="1.5" fill="#3f5c33" />
      <rect x="20" y="11" width="6" height="7" rx="1" fill="#3f5c33" />
      <circle cx="14" cy="26" r="4" fill="#243318" />
      <circle cx="25.5" cy="26" r="5.4" fill="#243318" />
      <circle cx="25.5" cy="26" r="2.3" fill="#8fae7a" />
    </Badge>
  );
}

export function AppleSymbol() {
  return (
    <Badge bg="#d9a35c">
      <path d="M20 14c-5 0-8.4 4-8.4 9a8.4 8.4 0 0 0 16.8 0c0-5-3.4-9-8.4-9Z" fill="#b5551f" />
      <path d="M20 14c0-2 1-3 3-3.4" stroke="#5c3a1c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M22 11c2-1 3 0 3.4 1.6" stroke="#8fae7a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </Badge>
  );
}

export function BarnSymbol() {
  return (
    <Badge bg="#c9781f">
      <polygon points="20,9 30,17 10,17" fill="#7a2f1c" />
      <rect x="12" y="17" width="16" height="12" fill="#8a2f2f" />
      <rect x="17.5" y="21" width="5" height="8" fill="#e9c77e" />
    </Badge>
  );
}

export function StarSymbol() {
  return (
    <Badge bg="#241408">
      <polygon
        points="20,7 23.5,16.5 33,17 25.5,23 28,32.5 20,27 12,32.5 14.5,23 7,17 16.5,16.5"
        fill="#f0c443"
        stroke="#a8631f"
        strokeWidth="1"
      />
    </Badge>
  );
}

export const SYMBOL_ICONS = {
  wheat: WheatSymbol,
  sun: SunSymbol,
  tractor: TractorSymbol,
  apple: AppleSymbol,
  barn: BarnSymbol,
  star: StarSymbol,
};
