export function RejectedAnimation({ size = 120 }: { size?: number }) {
  return (
    <div className="a-reject" style={{ width: size, height: size }} aria-label="Rejected">
      <svg viewBox="0 0 200 200" overflow="visible" role="img">
        <circle className="pulse"   cx="100" cy="100" r="60" />
        <circle className="ring-bg" cx="100" cy="100" r="50" />
        <circle className="ring"    cx="100" cy="100" r="50" />
        <circle className="disc"    cx="100" cy="100" r="50" />
        <path className="x-stroke"   d="M82 82 L118 118" />
        <path className="x-stroke b" d="M118 82 L82 118" />
      </svg>
    </div>
  );
}
