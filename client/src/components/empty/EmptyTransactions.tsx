interface EmptyTransactionsProps {
  onCta?: () => void;
}

export function EmptyTransactions({ onCta }: EmptyTransactionsProps) {
  return (
    <div className="es">
      <div className="es-art">
        <svg viewBox="0 0 200 150">
          <line className="ea-stroke-dim" x1="20" y1="115" x2="180" y2="115" strokeDasharray="2 4" />
          <g stroke="rgba(255,255,255,.18)" strokeWidth="1">
            <line x1="40" y1="115" x2="40" y2="120" />
            <line x1="80" y1="115" x2="80" y2="120" />
            <line x1="120" y1="115" x2="120" y2="120" />
            <line x1="160" y1="115" x2="160" y2="120" />
          </g>
          <g className="ea-tx-wave">
            <path className="ea-stroke" d="M20 90 L60 90 L70 90 L78 78 L86 102 L94 90 L180 90" />
          </g>
          <circle className="ea-dot" cx="78" cy="78" r="2.5" />
          <circle className="ea-dot" cx="86" cy="102" r="2.5" />
          <text x="20" y="38" fontFamily="JetBrains Mono" fontSize="9" fill="rgba(255,255,255,.35)" letterSpacing="1.5">NO ACTIVITY</text>
          <line className="ea-stroke-dim" x1="20" y1="44" x2="62" y2="44" />
        </svg>
      </div>
      <h3>No transactions yet</h3>
      <p>When you sign or receive transactions, Sage will log them here with full context.</p>
      {onCta && (
        <button className="es-cta" onClick={onCta}>Send first transaction</button>
      )}
    </div>
  );
}
