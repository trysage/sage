"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTokenDetail,
  getTokenChart,
  type TokenDetails,
  type TokenChartData,
  type ChartPeriod,
} from "@/lib/api";

export function useTokenDetail(tokenId: string | null) {
  const [detail, setDetail] = useState<TokenDetails | null>(null);
  const [chart, setChart] = useState<TokenChartData | null>(null);
  const [period, setPeriod] = useState<ChartPeriod>("day");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenId) { setDetail(null); setChart(null); return; }
    setLoadingDetail(true);
    setError(null);
    getTokenDetail(tokenId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingDetail(false));
  }, [tokenId]);

  const fetchChart = useCallback(
    (p: ChartPeriod) => {
      if (!tokenId) return;
      setLoadingChart(true);
      getTokenChart(tokenId, p)
        .then(setChart)
        .catch(() => setChart(null))
        .finally(() => setLoadingChart(false));
    },
    [tokenId]
  );

  useEffect(() => {
    fetchChart(period);
  }, [fetchChart, period]);

  return { detail, chart, period, setPeriod, loadingDetail, loadingChart, error };
}
