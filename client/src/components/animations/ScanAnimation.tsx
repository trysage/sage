export function ScanAnimation({ size = 120 }: { size?: number }) {
  return (
    <div className="a-scan" style={{ width: size, height: size }} aria-label="Scanning">
      <svg viewBox="0 0 200 200" overflow="visible" role="img">
        <defs>
          <radialGradient id="radar-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(91,209,142,0.05)" />
            <stop offset="100%" stopColor="rgba(91,209,142,0.18)" />
          </radialGradient>
          <linearGradient id="sweep-grad" x1="100" y1="100" x2="100" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="rgba(91,209,142,0)" />
            <stop offset="40%"  stopColor="rgba(91,209,142,0.05)" />
            <stop offset="100%" stopColor="rgba(91,209,142,0.55)" />
          </linearGradient>
          <clipPath id="radar-clip">
            <circle cx="100" cy="100" r="78" />
          </clipPath>
        </defs>

        <circle cx="100" cy="100" r="78" fill="url(#radar-grad)" />

        <circle className="radar-ring"     cx="100" cy="100" r="78" />
        <circle className="radar-ring dim" cx="100" cy="100" r="58" />
        <circle className="radar-ring dim" cx="100" cy="100" r="38" />
        <circle className="radar-ring dim" cx="100" cy="100" r="18" />

        <line className="radar-axis" x1="22"  y1="100" x2="178" y2="100" />
        <line className="radar-axis" x1="100" y1="22"  x2="100" y2="178" />

        <g clipPath="url(#radar-clip)">
          <circle className="blip-ring b1" cx="138" cy="62"  r="6" />
          <circle className="blip b1"      cx="138" cy="62"  r="2.6" />
          <circle className="blip-ring b2" cx="68"  cy="148" r="6" />
          <circle className="blip b2"      cx="68"  cy="148" r="2.6" />
          <circle className="blip-ring b3" cx="58"  cy="68"  r="6" />
          <circle className="blip b3"      cx="58"  cy="68"  r="2.6" />
        </g>

        <g className="radar-sweep" clipPath="url(#radar-clip)">
          <path d="M100 100 L100 22 A78 78 0 0 1 178 100 Z" fill="url(#sweep-grad)" />
          <line
            x1="100" y1="100" x2="178" y2="100"
            stroke="var(--mint-400)" strokeWidth="1.5" strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(91,209,142,.8))" }}
          />
        </g>

        <circle className="radar-center" cx="100" cy="100" r="3" />
        <circle cx="100" cy="100" r="6" fill="none" stroke="var(--mint-400)" strokeWidth="1" opacity=".5" />
      </svg>
    </div>
  );
}
