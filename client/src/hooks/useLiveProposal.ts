"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { getTransactionById, type TransactionItem } from "@/lib/api";

/**
 * Polls a single proposal every 3 s while `id` is non-null.
 * Stops automatically when the dialog closes (id → null).
 */
export function useLiveProposal(id: string | null) {
  const { identityToken } = useAuth();
  const [data, setData] = useState<TransactionItem | null>(null);

  const fetch_ = useCallback(async () => {
    if (!id) return;
    try {
      const tx = await getTransactionById(id, identityToken ?? undefined);
      setData(tx);
    } catch {
      // keep showing last known data on transient errors
    }
  }, [id, identityToken]);

  useEffect(() => {
    if (!id) { setData(null); return; }
    fetch_();
  }, [id, fetch_]);

  useEffect(() => {
    if (!id) return;
    const timer = setInterval(fetch_, 3_000);
    return () => clearInterval(timer);
  }, [id, fetch_]);

  return data;
}
