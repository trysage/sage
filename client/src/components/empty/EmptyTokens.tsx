interface EmptyTokensProps {
  onCta?: () => void;
}

export function EmptyTokens({ onCta }: EmptyTokensProps) {
  return (
    <div className="es">
      <div className="es-art">
        <svg viewBox="0 0 200 150">
          <g className="ea-tok-coin b">
            <circle cx="74" cy="80" r="28" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" fill="rgba(255,255,255,.03)" />
            <circle cx="74" cy="80" r="20" stroke="rgba(255,255,255,.14)" strokeWidth="1" fill="none" strokeDasharray="2 3" />
          </g>
          <g className="ea-tok-coin">
            <circle cx="118" cy="68" r="34" className="ea-stroke" />
            <circle cx="118" cy="68" r="34" className="ea-fill" />
            <circle cx="118" cy="68" r="22" stroke="var(--mint-300)" strokeWidth="1" fill="none" strokeDasharray="3 3" />
            <path d="M124 60 Q112 60 112 66 Q112 72 122 72 Q132 72 132 78 Q132 84 120 84"
              stroke="var(--mint-300)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </g>
          <path className="ea-stroke" d="M52 38 L52 32 M49 35 L55 35" />
          <line className="ea-stroke-dim" x1="40" y1="124" x2="160" y2="124" strokeDasharray="2 4" />
        </svg>
      </div>
      <h3>No tokens in wallet</h3>
      <p>Deposit SOL or any SPL token and your balances will appear here.</p>
      {onCta && (
        <button className="es-cta" onClick={onCta}>Receive tokens</button>
      )}
    </div>
  );
}
