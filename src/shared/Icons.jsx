export function PongIcon({ size = 48 }) {
  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox="0 0 12 10"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="1" height="8" fill="currentColor" />
      <rect x="10" y="1" width="1" height="8" fill="currentColor" />
      <rect x="5" y="4" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

export function TravelIcon({ size = 48 }) {
  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox="0 0 12 10"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="4" y="0" width="3" height="2" fill="currentColor" />
      <rect x="1" y="2" width="10" height="8" fill="currentColor" />
      <rect x="1" y="5" width="10" height="1" fill="#000" />
    </svg>
  );
}

export function AboutIcon({ size = 48 }) {
  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox="0 0 12 10"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="4" y="0" width="4" height="4" fill="currentColor" />
      <rect x="3" y="5" width="6" height="1" fill="currentColor" />
      <rect x="1" y="6" width="10" height="4" fill="currentColor" />
    </svg>
  );
}

export function PcaIcon({ size = 48 }) {
  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="2" y="1" width="4" height="1" fill="currentColor" />
      <rect x="1" y="2" width="1" height="4" fill="currentColor" />
      <rect x="6" y="2" width="1" height="4" fill="currentColor" />
      <rect x="2" y="6" width="4" height="1" fill="currentColor" />
      <rect x="7" y="7" width="1" height="1" fill="currentColor" />
      <rect x="8" y="8" width="1" height="1" fill="currentColor" />
      <rect x="9" y="9" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

export function WheelsIcon({ size = 48 }) {
  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox="0 0 12 10"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <polygon points="1,9 1,4 3.5,6 6,2 8.5,6 11,4 11,9" fill="currentColor" />
      <rect x="1" y="8.5" width="10" height="1" fill="currentColor" />
    </svg>
  );
}

export function CrtOverlay() {
  return <div className="crt-fx" />;
}
