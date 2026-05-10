/**
 * formatTokenAmount — token quantity for display in portfolio, send dialog, activity rows.
 * raw=true skips K/M/B compaction (use for input values, MAX display, secondary hints).
 */
export function formatTokenAmount(
  value: string | number,
  { raw = false }: { raw?: boolean } = {},
): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n) || n === 0) return "0";
  if (!raw) {
    if (n >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.?0+$/, "")}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2).replace(/\.?0+$/, "")}K`;
  }
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4, minimumFractionDigits: 0 });
  if (n >= 0.01) return n.toFixed(4).replace(/\.?0+$/, "") || "0";
  if (n >= 0.0001) return n.toFixed(6).replace(/\.?0+$/, "") || "0";
  const p = n.toPrecision(4);
  if (/[eE]/.test(p)) return p;
  return p.replace(/\.?0+$/, "") || "0";
}

/**
 * formatUSD — USD value for portfolio balances, transaction amounts, 24h changes.
 * Returns null for null/undefined inputs — caller supplies fallback (e.g. "—").
 * Uses K/M compaction for large values; toPrecision for sub-cent amounts.
 */
export function formatUSD(n: number | null | undefined): string | null {
  if (n == null) return null;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(2)}K`;
  if (abs > 0 && abs < 0.01) {
    const dec = Math.min(-Math.floor(Math.log10(abs)) + 2, 8);
    return `$${abs.toFixed(dec).replace(/0+$/, "").replace(/\.$/, "")}`;
  }
  return `$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * formatPrice — token price for the portfolio price column.
 * Handles the full range from sub-cent meme coins to BTC-level prices.
 */
export function formatPrice(p: number | null | undefined): string {
  if (p == null) return "—";
  if (p === 0) return "$0.00";
  if (p >= 1e9) return `$${(p / 1e9).toFixed(2)}B`;
  if (p >= 1e6) return `$${(p / 1e6).toFixed(2)}M`;
  if (p >= 1e3) return `$${(p / 1e3).toFixed(2)}K`;
  if (p >= 1) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p >= 0.0001) return `$${p.toFixed(6)}`;
  const dec = Math.min(-Math.floor(Math.log10(p)) + 2, 12);
  return `$${p.toFixed(dec).replace(/0+$/, "").replace(/\.$/, "")}`;
}

/**
 * formatCompact — large USD values with T/B/M/K suffix (market cap, FDV, etc.).
 * Returns null for null/undefined.
 */
export function formatCompact(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

/**
 * formatCompactNum — same as formatCompact but without the $ prefix (for supply figures).
 * Returns null for null/undefined.
 */
export function formatCompactNum(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString("en-US");
}

/**
 * formatPct — percentage change with +/− sign. Returns null for null/undefined.
 */
export function formatPct(n: number | null | undefined): string | null {
  if (n == null) return null;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
