"use client";

import { useCallback } from "react";

/**
 * Combines multiple refetch functions into a single refreshAll().
 * Use this after user actions (send, execute, receive) to immediately
 * sync all data sources. Add new hooks here as the app grows.
 */
export function useRefreshAll(...refetches: Array<() => void>) {
  return useCallback(() => {
    refetches.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refetches);
}
