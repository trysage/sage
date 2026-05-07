"use client";

import { useEffect, useRef } from "react";

/**
 * Attaches polling + tab-visibility refetch to any refetch function.
 * Drop this into any data hook — it does nothing else.
 *
 * @param refetch  Stable callback (wrap in useCallback before passing)
 * @param intervalMs  Poll interval in ms (default 30 s)
 */
export function useAutoRefresh(refetch: () => void, intervalMs = 30_000) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const tick = () => refetchRef.current();

    const id = setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
}
