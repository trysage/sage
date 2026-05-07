"use client";

import { useId } from "react";

export function PendingAnimation({ size = 120 }: { size?: number }) {
  const uid = useId();
  const topId = `hg-top-${uid}`;
  const botId = `hg-bot-${uid}`;

  return (
    <div className="a-pending" style={{ width: size, height: size }} aria-label="Pending">
      <svg viewBox="0 0 200 200" overflow="visible" role="img">
        <defs>
          <clipPath id={topId}>
            <path d="M76 60 L124 60 L100 100 Z" />
          </clipPath>
          <clipPath id={botId}>
            <path d="M76 140 L124 140 L100 100 Z" />
          </clipPath>
        </defs>

        <circle className="hg-ring" cx="100" cy="100" r="68" />

        <g className="hg-body">
          <line className="hg-frame" x1="72" y1="60" x2="128" y2="60" />
          <line className="hg-frame" x1="72" y1="140" x2="128" y2="140" />
          <path className="hg-glass" d="M76 60 L124 60 L100 100 L124 140 L76 140 L100 100 Z" />
          <path className="hg-frame" d="M76 60 L124 60 L100 100 L124 140 L76 140 L100 100 Z" />

          <g clipPath={`url(#${topId})`}>
            <rect className="sand-top" x="60" y="60" width="80" height="40" />
          </g>
          <g clipPath={`url(#${botId})`}>
            <rect className="sand-bot" x="60" y="100" width="80" height="40" />
          </g>

          <line className="sand-stream" x1="100" y1="100" x2="100" y2="138" />

          <circle className="grain-dot"    cx="100" cy="110" r="1.2" />
          <circle className="grain-dot g2" cx="100" cy="110" r="1.2" />
          <circle className="grain-dot g3" cx="100" cy="110" r="1.2" />
        </g>
      </svg>
    </div>
  );
}
