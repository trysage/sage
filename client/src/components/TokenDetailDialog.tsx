"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Dialog } from "./Dialog";
import { useTokenDetail } from "@/hooks/useTokenDetail";
import { formatPrice, formatCompact, formatCompactNum, formatPct } from "@/lib/format";
import type { TokenPosition, TokenChartData, ChartPeriod } from "@/lib/api";

// ── Period config ─────────────────────────────────────────────────────────────

const PERIODS: { label: string; value: ChartPeriod }[] = [
  { label: "1D", value: "day" },
  { label: "1W", value: "week" },
  { label: "1M", value: "month" },
  { label: "1Y", value: "year" },
  { label: "MAX", value: "max" },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function xTickFormatter(ts: number, period: ChartPeriod): string {
  const d = new Date(ts);
  if (period === "day") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (period === "week" || period === "month") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (period === "year") {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function yTickFormatter(p: number): string {
  if (p < 0.0001) return `$${p.toExponential(1)}`;
  if (p < 0.01)   return `$${p.toFixed(5)}`;
  if (p < 1)      return `$${p.toFixed(3)}`;
  if (p >= 1e6)   return `$${(p / 1e6).toFixed(1)}M`;
  if (p >= 1e3)   return `$${(p / 1e3).toFixed(1)}K`;
  return `$${p.toFixed(2)}`;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { timestamp: number; price: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { timestamp, price } = payload[0].payload;
  const d = new Date(timestamp);
  return (
    <div className="tdlg-tooltip">
      <span className="tdlg-tt-date">
        {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        {" "}
        {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
      </span>
      <span className="tdlg-tt-price">{formatPrice(price)}</span>
    </div>
  );
}

// ── Price chart ───────────────────────────────────────────────────────────────

function PriceChart({
  chart,
  up,
  loading,
  period,
}: {
  chart: TokenChartData | null;
  up: boolean;
  loading: boolean;
  period: ChartPeriod;
}) {
  const color = up ? "#5BD18E" : "#F87171";
  const gradId = `tdlg-grad-${up ? "up" : "dn"}`;

  const data = useMemo(
    () =>
      chart?.points.map((p) => ({
        timestamp: p.timestamp * 1000,
        price: p.price,
      })) ?? [],
    [chart]
  );

  if (loading) {
        return (
      <div className="tdlg-chart-wrap">
        <div className="tdlg-chart-skel" />
      </div>
    );
  }

  if (!chart || data.length < 2) {
    return (
      <div className="tdlg-chart-wrap tdlg-chart-empty">
        <span>No chart data</span>
      </div>
    );
  }

  return (
    <motion.div
      className="tdlg-chart-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => xTickFormatter(v as number, period)}
            tick={{ fill: "var(--ink-300)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            tickCount={5}
            minTickGap={40}
          />

          <YAxis
            dataKey="price"
            orientation="right"
            tickFormatter={yTickFormatter}
            tick={{ fill: "var(--ink-300)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickCount={4}
            domain={["auto", "auto"]}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1, strokeDasharray: "3 3" }}
          />

          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="tdlg-stat">
      <span className="tdlg-stat-label">{label}</span>
      <span className="tdlg-stat-value">{value ?? "—"}</span>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface TokenDetailDialogProps {
  open: boolean;
  onClose: () => void;
  token: TokenPosition | null;
}

export function TokenDetailDialog({ open, onClose, token }: TokenDetailDialogProps) {
  const { detail, chart, period, setPeriod, loadingDetail, loadingChart } = useTokenDetail(
    open && token?.tokenId ? token.tokenId : null
  );

  const price = detail?.marketData?.price ?? token?.price ?? null;
  const pct1d = detail?.marketData?.changes?.percent1d ?? null;
  const up = pct1d == null ? true : pct1d >= 0;

  const circSupply   = detail?.marketData?.circulatingSupply ?? null;
  const marketCap    = detail?.marketData?.marketCap ?? null;
  const fdv          = detail?.marketData?.fullyDilutedValuation ?? null;

  return (
    <Dialog open={open} onClose={onClose}>
      <AnimatePresence mode="wait">
        {token && (
          <motion.div
            key={token.id}
            className="tdlg-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Token header */}
            <div className="tdlg-head">
              <div className="tdlg-icon">
                {token.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={token.iconUrl}
                    alt={token.symbol}
                    style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  token.name.charAt(0)
                )}
              </div>
              <div className="tdlg-head-text">
                <span className="tdlg-name">{token.name}</span>
                <span className="tdlg-symbol">{token.symbol}</span>
              </div>

              {/* Price + 24h change — top right */}
              <div className="tdlg-price-block">
                <span className="tdlg-price">{formatPrice(price)}</span>
                {pct1d != null && (
                  <span className={`tdlg-change ${up ? "up" : "dn"}`}>
                    {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {formatPct(pct1d)}
                  </span>
                )}
              </div>
            </div>

            {/* Chart */}
            <PriceChart chart={chart} up={up} loading={loadingChart} period={period} />

            {/* Period tabs */}
            <div className="tdlg-periods">
              {PERIODS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  className={`tdlg-period ${period === value ? "on" : ""}`}
                  onClick={() => setPeriod(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Stats — market cap, fdv, circulating supply */}
            {!loadingDetail && (
              <motion.div
                className="tdlg-stats"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Stat label="Market Cap" value={formatCompact(marketCap)} />
                <Stat label="FDV" value={formatCompact(fdv)} />
                {circSupply != null && (
                  <Stat label="Circ. Supply" value={formatCompactNum(circSupply)} />
                )}
              </motion.div>
            )}

            {/* Your balance */}
            <div className="tdlg-balance">
              <span className="tdlg-balance-label">Your balance</span>
              <span className="tdlg-balance-val">
                {token.balance} {token.symbol}
                {token.usdValue != null && (
                  <span className="tdlg-balance-usd">
                    {` · ${formatCompact(token.usdValue) ?? ""}`}
                  </span>
                )}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
