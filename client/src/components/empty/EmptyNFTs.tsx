export function EmptyNFTs() {
  return (
    <div className="es">
      <div className="es-art">
        <svg viewBox="0 0 200 150">
          <g className="ea-nft-frame" style={{ animationDelay: "-1s" }}>
            <rect x="58" y="32" width="78" height="78" rx="6" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" fill="none" />
          </g>
          <g className="ea-nft-frame">
            <rect x="50" y="40" width="78" height="78" rx="6" className="ea-stroke" />
            <rect x="50" y="40" width="78" height="78" rx="6" className="ea-fill" />
            <path className="ea-stroke" d="M58 100 L74 80 L88 96 L102 76 L120 100" />
            <circle cx="112" cy="62" r="6" stroke="var(--mint-300)" strokeWidth="1.5" fill="none" />
          </g>
          <g className="ea-nft-frame" style={{ animationDelay: "-2.5s" }}>
            <rect x="138" y="58" width="44" height="44" rx="4" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
          </g>
          <path className="ea-stroke" d="M158 36 L158 28 M154 32 L162 32" />
        </svg>
      </div>
      <h3>Your collection is empty</h3>
      <p>Mint, buy, or receive an NFT and it will appear here — ready to view, send, or list.</p>
    </div>
  );
}
