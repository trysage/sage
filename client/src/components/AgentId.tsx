"use client";

import { useScreeningStatus } from "@/app/context/ScreeningStatusContext";

export function AgentId() {
  const { isScreeningActive, loading } = useScreeningStatus();
  const inactive = !loading && !isScreeningActive;

  return (
    <span className={`agent-id${inactive ? " inactive" : ""}`}>
      <span className="av">
        <img src="/sage-mark-mint.png" alt="Sage" />
      </span>
      <span>Sage · {inactive ? "OFF" : "ON"}</span>
      <span className={`live${inactive ? " inactive" : ""}`} />
    </span>
  );
}
