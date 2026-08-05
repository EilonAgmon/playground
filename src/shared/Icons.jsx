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

export function CrtOverlay() {
  return <div className="crt-fx" />;
}
