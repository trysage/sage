"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { getPortfolio, type PortfolioResponse } from "@/lib/api";

export function usePortfolio() {
  const { vaultPda, identityToken } = useAuth();
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!vaultPda) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getPortfolio(vaultPda, identityToken ?? undefined);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [vaultPda, identityToken]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
