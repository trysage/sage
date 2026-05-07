"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { getPortfolio, type PortfolioResponse } from "@/lib/api";
import { useAutoRefresh } from "./useAutoRefresh";

export function usePortfolio() {
  const { vaultPda, identityToken } = useAuth();
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (silent = false) => {
    if (!vaultPda) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await getPortfolio(vaultPda, identityToken ?? undefined);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [vaultPda, identityToken]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  useAutoRefresh(() => fetch_(true), 30_000);

  return { data, loading, error, refetch: fetch_ };
}
