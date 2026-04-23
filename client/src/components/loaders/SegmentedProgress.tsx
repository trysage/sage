"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Props {
  label?: string;
  total?: number;
}

export function SegmentedProgress({ label = "Verifying · 24 checks", total = 24 }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    function step() {
      if (i <= total) {
        setActive(i);
        const delay = i === total ? 1100 : 110;
        i++;
        timer = setTimeout(step, delay);
      } else {
        i = 0;
        timer = setTimeout(step, 320);
      }
    }

    timer = setTimeout(step, 110);
    return () => clearTimeout(timer);
  }, [total]);

  const pct = Math.round((active / total) * 100);
  const pctStr = String(pct).padStart(2, "0") + "%";

  return (
    <div className="l4">
      <div className="l4-head">
        <Image
          src="/sage-mark-mint.png"
          alt="Sage"
          width={22}
          height={22}
          style={{ animation: "l4-pulse 2s ease-in-out infinite" }}
        />
        <span className="l4-label">{label}</span>
        <span className="l4-pct">{pctStr}</span>
      </div>
      <div className="l4-bar">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`l4-seg${i < active ? " on" : ""}`} />
        ))}
      </div>
      <div className="l4-ticks">
        <span>0</span>
        <span>·</span>
        <span>·</span>
        <span>·</span>
        <span>{total}</span>
      </div>
    </div>
  );
}
