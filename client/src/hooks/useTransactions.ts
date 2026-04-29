"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { getTransactions, type TransactionItem } from "@/lib/api";

export function useTransactions() {
  const { vaultPda, identityToken } = useAuth();
  const [data, setData] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!vaultPda) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getTransactions(vaultPda, identityToken ?? undefined);
      setData(result.transactions);
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
