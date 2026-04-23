"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Props {
  message?: string;
}

const DOT_STATES = ["", ".", "..", "..."];

export function BreathingMark({ message = "Sage is reading" }: Props) {
  const [dotIdx, setDotIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setDotIdx((i) => (i + 1) % DOT_STATES.length);
    }, 380);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="l1">
      <div className="mark-wrap">
        <Image
          src="/sage-mark-mint.png"
          alt="Sage"
          width={96}
          height={96}
          style={{ animation: "breath 2.4s ease-in-out infinite", position: "relative", zIndex: 1 }}
        />
      </div>
      <span className="l1-status">
        {message}
        <span className="l1-dots">{DOT_STATES[dotIdx]}</span>
      </span>
    </div>
  );
}
