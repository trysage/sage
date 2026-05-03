interface EmptyRequestsProps {
  onCta?: () => void;
}

export function EmptyRequests({ onCta }: EmptyRequestsProps) {
  return (
    <div className="es">
      <div className="es-art">
        <svg viewBox="0 0 200 150">
          <g className="ea-req-env">
            <rect x="56" y="46" width="88" height="64" rx="4" className="ea-stroke" />
            <rect x="56" y="46" width="88" height="64" rx="4" className="ea-fill" />
            <path className="ea-stroke" d="M56 50 L100 82 L144 50" />
            <circle cx="100" cy="78" r="3" className="ea-dot" />
          </g>
          <circle cx="38" cy="60" r="1.5" fill="rgba(255,255,255,.2)" />
          <circle cx="166" cy="42" r="1.5" fill="rgba(255,255,255,.2)" />
          <circle cx="170" cy="98" r="1.5" fill="rgba(255,255,255,.2)" />
          <circle cx="32" cy="100" r="1.5" fill="rgba(255,255,255,.2)" />
          <line className="ea-stroke-dim" x1="40" y1="124" x2="160" y2="124" strokeDasharray="2 4" />
        </svg>
      </div>
      <h3>No pending requests</h3>
      <p>Sage is watching. New signature requests from connected dApps will surface here for review.</p>
      {onCta && (
        <button className="es-cta" onClick={onCta}>Connect a dApp</button>
      )}
    </div>
  );
}
