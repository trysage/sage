import { formatUnits } from "viem";

const ZERION_API_KEY = process.env.ZERION_API_KEY;
const BASE_URL = "https://api.zerion.io/v1";

const SOLANA_CHAIN = "solana";
const SOLANA_CHAIN_ID = 101; // Solana mainnet-beta (Wormhole convention)

// ── Public types ──────────────────────────────────────────────────────────────

export interface TokenPosition {
  id: string;
  tokenId?: string;
  name: string;
  symbol: string;
  decimals: number;
  iconUrl?: string;
  usdValue: number | null;
  balance: string;
  price: number;
  /** Absolute price change in USD over last 24h, or null if unavailable */
  priceChange1d: number | null;
  /** Percentage price change over last 24h, or null if unavailable */
  pricePercentChange1d: number | null;
  /** Solana mint address, or empty string for native SOL */
  address: string;
  chain: { id: string; chainId: number; name: string };
  verified: boolean;
}

export interface PortfolioResponse {
  tokens: TokenPosition[];
  totalUsd: number;
  /** 24h portfolio % change from Zerion, null if unavailable */
  percentChange24h: number | null;
}

export interface ZerionToken {
  symbol: string;
  name: string;
  /** Solana mint address, empty string for native SOL */
  address: string;
  iconUrl: string | null;
  verified: boolean;
}

export interface ZerionTransfer {
  direction: "in" | "out" | "self";
  token: ZerionToken;
  amount: string;
  valueUSD: number | null;
  price: number | null;
  sender: string;
  recipient: string;
}

export interface ZerionHistoryItem {
  hash: string;
  timestamp: string;
  operationType: string;
  direction: "send" | "receive";
  token: ZerionToken;
  amount: string;
  valueUSD: number | null;
  from: string;
  to: string;
  received?: {
    token: ZerionToken;
    amount: string;
    valueUSD: number | null;
  };
  transfers: ZerionTransfer[];
  isTrash: boolean;
}

export interface TokenDetails {
  tokenId: string;
  name: string;
  symbol: string;
  description: string | null;
  iconUrl: string | null;
  verified: boolean;
  externalLinks: { type: string; name: string; url: string }[];
  marketData?: {
    totalSupply: number | null;
    circulatingSupply: number | null;
    marketCap: number | null;
    fullyDilutedValuation: number | null;
    price: number | null;
    changes: {
      percent1d: number | null;
      percent30d: number | null;
      percent90d: number | null;
      percent365d: number | null;
    };
  };
}

export interface TokenChartPoint {
  timestamp: number;
  price: number;
}

export interface TokenChartData {
  beginAt: string;
  endAt: string;
  stats: { first: number; min: number; avg: number; max: number; last: number };
  points: TokenChartPoint[];
}

export type ChartPeriod = "day" | "week" | "month" | "year" | "max";

export interface SearchedToken {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  iconUrl: string | null;
  /** Solana mint address */
  address: string | null;
}

// ── Internal raw types ────────────────────────────────────────────────────────

interface RawImpl {
  chain_id: string;
  address: string;
  decimals: number;
}

interface RawFungibleInfo {
  name?: string;
  symbol?: string;
  icon?: { url?: string } | null;
  flags?: { verified?: boolean };
  implementations?: RawImpl[];
}

interface RawTransfer {
  fungible_info?: RawFungibleInfo;
  direction?: string;
  quantity?: { float?: number };
  value?: number | null;
  price?: number | null;
  sender?: string;
  recipient?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RECEIVE_OPS = new Set(["receive", "withdraw", "borrow", "mint"]);

/** Extract the Solana mint address for a fungible */
function solanaAddress(fi?: RawFungibleInfo): string {
  return fi?.implementations?.find((i) => i.chain_id === SOLANA_CHAIN)?.address ?? "";
}

function toToken(fi?: RawFungibleInfo): ZerionToken {
  return {
    symbol: fi?.symbol ?? "?",
    name: fi?.name ?? "",
    address: solanaAddress(fi),
    iconUrl: fi?.icon?.url ?? null,
    verified: fi?.flags?.verified ?? false,
  };
}

function formatAmount(n: number): string {
  if (n >= 1) return parseFloat(n.toFixed(4)).toString();
  if (n >= 0.0001) return n.toFixed(6).replace(/\.?0+$/, "");
  return n.toPrecision(4);
}

function toTransfer(t: RawTransfer): ZerionTransfer | null {
  if (!t.fungible_info) return null;
  const qty = t.quantity?.float ?? 0;
  return {
    direction: (t.direction ?? "out") as "in" | "out" | "self",
    token: toToken(t.fungible_info),
    amount: qty > 0 ? formatAmount(qty) : "",
    valueUSD: t.value ?? null,
    price: t.price ?? null,
    sender: t.sender ?? "",
    recipient: t.recipient ?? "",
  };
}

function pickDir(
  transfers: ZerionTransfer[],
  dir: "in" | "out" | "self"
): ZerionTransfer | undefined {
  const candidates = transfers.filter((t) => t.direction === dir && t.token.symbol !== "?");
  if (candidates.length <= 1) return candidates[0];
  // When multiple transfers exist (e.g. token transfer + SOL rent), prefer the non-SOL one
  return candidates.find((t) => t.token.address !== "") ?? candidates[0];
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export async function fetchTokenPositions(
  address: string,
  pageSize = 100,
  maxRetries = 3
): Promise<{ tokens: TokenPosition[] }> {
  if (!ZERION_API_KEY) {
    console.warn("ZERION_API_KEY not set; portfolio will be empty");
    return { tokens: [] };
  }

  const params = new URLSearchParams({
    currency: "usd",
    "filter[chain_ids]": SOLANA_CHAIN,
    "filter[trash]": "only_non_trash",
    sort: "value",
    "page[size]": pageSize.toString(),
  });

  const url = `${BASE_URL}/wallets/${address}/positions/?${params}`;
  const options: RequestInit = {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Basic ${ZERION_API_KEY}`,
    },
  };

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const data: unknown[] = json?.data ?? [];

      const walletPositions = data.filter((p: unknown) => {
        const a = (p as {
          attributes?: {
            position_type?: string;
            flags?: { displayable?: boolean };
            fungible_info?: unknown;
          };
        })?.attributes;
        return a?.position_type === "wallet" && a?.flags?.displayable && a?.fungible_info;
      });

      const tokens: TokenPosition[] = [];
      for (const position of walletPositions) {
        const pos = position as {
          id?: string;
          attributes: Record<string, unknown>;
          relationships?: {
            chain?: { data?: { id?: string } };
            fungible?: { data?: { id?: string } };
          };
        };
        const attrs = pos.attributes;
        const rel = pos.relationships;
        const chainIdStr = rel?.chain?.data?.id ?? "";
        if (chainIdStr !== SOLANA_CHAIN) continue;

        const fungibleInfo = attrs.fungible_info as RawFungibleInfo;
        const quantity = attrs.quantity as { int: string; decimals: number };
        const changes = attrs.changes as { absolute_1d?: number; percent_1d?: number } | null;
        const impl = fungibleInfo?.implementations?.find(
          (i) => i.chain_id === SOLANA_CHAIN
        );
        const mintAddress = impl?.address ?? "";

        tokens.push({
          id: pos.id ?? "",
          tokenId: rel?.fungible?.data?.id,
          name: fungibleInfo?.name ?? "Unknown",
          symbol: fungibleInfo?.symbol ?? "?",
          decimals: quantity?.decimals ?? impl?.decimals ?? 9,
          iconUrl: fungibleInfo?.icon?.url,
          usdValue: (attrs.value as number) ?? null,
          balance: formatUnits(BigInt(quantity?.int ?? "0"), quantity?.decimals ?? 9),
          price: (attrs.price as number) ?? 0,
          priceChange1d: changes?.absolute_1d ?? null,
          pricePercentChange1d: changes?.percent_1d ?? null,
          address: mintAddress,
          chain: { id: SOLANA_CHAIN, chainId: SOLANA_CHAIN_ID, name: "Solana" },
          verified: fungibleInfo?.flags?.verified ?? false,
        });
      }

      return { tokens };
    } catch (err) {
      console.error(`Zerion positions attempt ${attempt + 1}/${maxRetries}:`, err);
      attempt++;
      if (attempt === maxRetries) return { tokens: [] };
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  return { tokens: [] };
}

async function fetchWalletPortfolioChange(
  address: string,
  maxRetries = 2
): Promise<number | null> {
  if (!ZERION_API_KEY) return null;
  const url = `${BASE_URL}/wallets/${address}/portfolio?${new URLSearchParams({
    currency: "usd",
    "filter[chain_ids]": SOLANA_CHAIN,
    "filter[positions]": "no_filter",
  })}`;
  const options: RequestInit = {
    headers: { accept: "application/json", authorization: `Basic ${ZERION_API_KEY}` },
  };
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const percent = data?.data?.attributes?.changes?.percent_1d;
      return typeof percent === "number" ? percent : null;
    } catch {
      if (attempt === maxRetries - 1) return null;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return null;
}

export async function getPortfolioForAddress(address: string): Promise<PortfolioResponse> {
  const [positionsResult, percentChange24h] = await Promise.all([
    fetchTokenPositions(address, 100),
    fetchWalletPortfolioChange(address),
  ]);
  const { tokens } = positionsResult;
  const totalUsd = tokens.reduce((sum, t) => sum + (t.usdValue ?? 0), 0);
  return { tokens, totalUsd, percentChange24h };
}

// ── Transfer history ──────────────────────────────────────────────────────────

export async function fetchTransfers(
  address: string,
  pageSize = 25,
  maxRetries = 2
): Promise<ZerionHistoryItem[]> {
  if (!ZERION_API_KEY) return [];

  const params = new URLSearchParams({
    currency: "usd",
    "filter[chain_ids]": SOLANA_CHAIN,
    "page[size]": pageSize.toString(),
  });
  const url = `${BASE_URL}/wallets/${address}/transactions/?${params}`;
  const options: RequestInit = {
    headers: { accept: "application/json", authorization: `Basic ${ZERION_API_KEY}` },
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const items: ZerionHistoryItem[] = [];

      for (const entry of (json?.data ?? []) as unknown[]) {
        const tx = entry as {
          attributes: {
            operation_type?: string;
            hash?: string;
            mined_at?: string;
            sent_from?: string;
            sent_to?: string;
            transfers?: RawTransfer[];
            flags?: { is_trash?: boolean };
          };
        };

        const attrs = tx.attributes;
        const hash = attrs.hash;
        const timestamp = attrs.mined_at;
        if (!hash || !timestamp) continue;

        const operationType = attrs.operation_type ?? "execute";
        const isTrash = attrs.flags?.is_trash ?? false;
        const sentFrom = attrs.sent_from ?? "";
        const sentTo = attrs.sent_to ?? "";

        const transfers: ZerionTransfer[] = (attrs.transfers ?? []).flatMap((t) => {
          const r = toTransfer(t);
          return r ? [r] : [];
        });

        // ── TRADE ────────────────────────────────────────────────────────────
        if (operationType === "trade") {
          const sold = pickDir(transfers, "out");
          const bought = pickDir(transfers, "in");
          if (!sold) continue;

          items.push({
            hash, timestamp, operationType, isTrash,
            direction: "send",
            token: sold.token,
            amount: sold.amount,
            valueUSD: sold.valueUSD,
            from: sold.sender || sentFrom,
            to: sold.recipient || sentTo,
            received: bought
              ? { token: bought.token, amount: bought.amount, valueUSD: bought.valueUSD }
              : undefined,
            transfers,
          });
          continue;
        }

        // ── RECEIVE-LIKE ──────────────────────────────────────────────────────
        if (RECEIVE_OPS.has(operationType)) {
          const incoming = pickDir(transfers, "in");
          if (!incoming) continue;

          items.push({
            hash, timestamp, operationType, isTrash,
            direction: "receive",
            token: incoming.token,
            amount: incoming.amount,
            valueUSD: incoming.valueUSD,
            from: incoming.sender || sentFrom,
            to: incoming.recipient || address,
            transfers,
          });
          continue;
        }

        // ── EXECUTE (pure contract call, no token transfers) ──────────────────
        if (operationType === "execute" && transfers.length === 0) {
          items.push({
            hash, timestamp, operationType, isTrash,
            direction: "send",
            token: { symbol: "", name: "", address: "", iconUrl: null, verified: false },
            amount: "",
            valueUSD: null,
            from: sentFrom,
            to: sentTo,
            transfers: [],
          });
          continue;
        }

        // ── SEND / DEPOSIT / REPAY / BURN and everything else ─────────────────
        const outgoing =
          pickDir(transfers, "out") ??
          pickDir(transfers, "self") ??
          pickDir(transfers, "in");

        if (!outgoing) continue;

        items.push({
          hash, timestamp, operationType, isTrash,
          direction: "send",
          token: outgoing.token,
          amount: outgoing.amount,
          valueUSD: outgoing.valueUSD,
          from: outgoing.sender || sentFrom,
          to: outgoing.recipient || sentTo,
          transfers,
        });
      }


      return items;
    } catch (err) {
      if (attempt === maxRetries - 1) {
        console.error("fetchTransfers failed:", err);
        return [];
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return [];
}

// ── Token details & charts ────────────────────────────────────────────────────

export async function fetchTokenDetails(
  tokenId: string,
  currency = "usd",
  maxRetries = 3
): Promise<TokenDetails | null> {
  if (!ZERION_API_KEY) return null;
  const url = `${BASE_URL}/fungibles/${tokenId}?${new URLSearchParams({ currency })}`;
  const options: RequestInit = {
    headers: { accept: "application/json", authorization: `Basic ${ZERION_API_KEY}` },
  };
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.data?.attributes) return null;
      const { id, attributes: a } = data.data;
      return {
        tokenId: id,
        name: a.name,
        symbol: a.symbol,
        description: a.description ?? null,
        iconUrl: a.icon?.url ?? null,
        verified: a.flags?.verified ?? false,
        externalLinks: (a.external_links ?? []).map((l: { type: string; name: string; url: string }) => ({
          type: l.type, name: l.name, url: l.url,
        })),
        marketData: a.market_data ? {
          totalSupply: a.market_data.total_supply ?? null,
          circulatingSupply: a.market_data.circulating_supply ?? null,
          marketCap: a.market_data.market_cap ?? null,
          fullyDilutedValuation: a.market_data.fully_diluted_valuation ?? null,
          price: a.market_data.price ?? null,
          changes: {
            percent1d: a.market_data.changes?.percent_1d ?? null,
            percent30d: a.market_data.changes?.percent_30d ?? null,
            percent90d: a.market_data.changes?.percent_90d ?? null,
            percent365d: a.market_data.changes?.percent_365d ?? null,
          },
        } : undefined,
      };
    } catch (err) {
      if (attempt === maxRetries - 1) { console.error("fetchTokenDetails failed:", err); return null; }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return null;
}

export async function fetchSinglePeriodChart(
  tokenId: string,
  period: ChartPeriod,
  currency: string,
  options: RequestInit
): Promise<TokenChartData | null> {
  const url = `${BASE_URL}/fungibles/${tokenId}/charts/${period}?${new URLSearchParams({ currency })}`;
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data?.attributes) return null;
    const a = data.data.attributes;
    return {
      beginAt: a.begin_at,
      endAt: a.end_at,
      stats: { first: a.stats.first, min: a.stats.min, avg: a.stats.avg, max: a.stats.max, last: a.stats.last },
      points: (a.points as [number, number][]).map(([timestamp, price]) => ({ timestamp, price })),
    };
  } catch {
    return null;
  }
}

export async function fetchTokenChartData(
  tokenId: string,
  currency = "usd"
): Promise<Record<ChartPeriod, TokenChartData | null>> {
  if (!ZERION_API_KEY) return { day: null, week: null, month: null, year: null, max: null };
  const options: RequestInit = {
    headers: { accept: "application/json", authorization: `Basic ${ZERION_API_KEY}` },
  };
  const periods: ChartPeriod[] = ["day", "week", "month", "year", "max"];
  const results = await Promise.all(
    periods.map((p) => fetchSinglePeriodChart(tokenId, p, currency, options))
  );
  return Object.fromEntries(periods.map((p, i) => [p, results[i]])) as Record<ChartPeriod, TokenChartData | null>;
}

export async function fetchTokenSearch(
  query: string,
  pageSize = 20
): Promise<SearchedToken[]> {
  if (!ZERION_API_KEY) return [];

  const params = new URLSearchParams({
    currency: "usd",
    "page[size]": pageSize.toString(),
    "filter[implementation_chain_id]": SOLANA_CHAIN,
    "filter[search_query]": query,
    sort: "-market_data.market_cap",
  });

  const res = await fetch(`${BASE_URL}/fungibles/?${params}`, {
    headers: { accept: "application/json", authorization: `Basic ${ZERION_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Zerion fungibles ${res.status}`);

  const json = await res.json();
  const data: unknown[] = json?.data ?? [];

  return data
    .filter((item: unknown) => !!(item as { attributes?: unknown }).attributes)
    .map((item: unknown) => {
      const t = item as {
        id: string;
        attributes: {
          name: string;
          symbol: string;
          icon?: { url?: string };
          implementations?: { chain_id: string; address?: string | null; decimals?: number }[];
        };
      };
      const impl = t.attributes.implementations?.find(
        (i) => i.chain_id === SOLANA_CHAIN
      );
      return {
        id: t.id,
        name: t.attributes.name,
        symbol: t.attributes.symbol,
        decimals: impl?.decimals ?? 9,
        iconUrl: t.attributes.icon?.url ?? null,
        address: impl?.address ?? null,
      };
    })
    .filter((t) => t.address);
}
