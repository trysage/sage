const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function authHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

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
  priceChange1d: number | null;
  pricePercentChange1d: number | null;
  address: string;
  chain: { id: string; chainId: number; name: string };
  verified: boolean;
  /** True for zero-balance fallback entries shown when the portfolio is sparse */
  placeholder?: boolean;
}

export interface PortfolioResponse {
  tokens: TokenPosition[];
  totalUsd: number;
  percentChange24h: number | null;
}

export async function getPortfolio(
  address: string,
  token?: string
): Promise<PortfolioResponse> {
  const res = await fetch(
    `${API_URL}/portfolio?address=${encodeURIComponent(address)}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(`Portfolio fetch failed: ${res.status}`);
  return res.json();
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface TransactionItem {
  id: string;
  multisigAddress?: string;
  vaultAddress: string;
  proposalIndex?: number | null;
  to: string | null;
  amount: string | null;
  tokenSymbol: string | null;
  tokenAddress: string | null;
  tokenIconUrl: string | null;
  proposedBy?: string | null;
  proposedAt: string;
  executedAt: string | null;
  txSignature: string | null;
  status: string;
  inReview?: boolean;
  screeningDisabled?: boolean;
  riskVerdict?: "APPROVE" | "REVIEW" | "BLOCK" | null;
  source: "sage-only" | "zerion-only" | "both";
  direction?: "send" | "receive";
  operationType?: string;
  valueUSD?: number | null;
  tradeReceived?: { symbol: string; amount: string; iconUrl: string };
}

export async function getTransactions(
  vaultAddress: string,
  token?: string
): Promise<{ transactions: TransactionItem[] }> {
  const res = await fetch(
    `${API_URL}/transactions?vaultAddress=${encodeURIComponent(vaultAddress)}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(`Transactions fetch failed: ${res.status}`);
  return res.json();
}

// ── Token detail ──────────────────────────────────────────────────────────────

export type ChartPeriod = "day" | "week" | "month" | "year" | "max";

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

export async function getTokenDetail(tokenId: string): Promise<TokenDetails> {
  const res = await fetch(`${API_URL}/tokens/${encodeURIComponent(tokenId)}`);
  if (!res.ok) throw new Error(`Token detail fetch failed: ${res.status}`);
  return res.json();
}

export async function getTokenChart(
  tokenId: string,
  period: ChartPeriod = "day"
): Promise<TokenChartData> {
  const res = await fetch(
    `${API_URL}/tokens/${encodeURIComponent(tokenId)}/chart?period=${period}`
  );
  if (!res.ok) throw new Error(`Token chart fetch failed: ${res.status}`);
  return res.json();
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function upsertUser(
  fields: {
    vaultAddress: string;
    signerAddress?: string;
    name?: string;
    email?: string;
    telegramId?: string;
  },
  token?: string
): Promise<void> {
  const res = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`User upsert failed: ${res.status}`);
}

// ── Screening status ──────────────────────────────────────────────────────────

export interface StatusResponse {
  screeningMode: boolean;
  botConnected: boolean;
  telegramChatId: string | null;
  lastCheck: string | null;
}

export async function getStatus(vaultAddress: string, token?: string): Promise<StatusResponse> {
  const res = await fetch(`${API_URL}/status?vault=${encodeURIComponent(vaultAddress)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
  return res.json();
}

export async function patchStatus(
  vaultAddress: string,
  patch: { screeningMode?: boolean; telegramChatId?: string; botConnected?: boolean },
  token?: string
): Promise<StatusResponse> {
  const res = await fetch(`${API_URL}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ vault: vaultAddress, ...patch }),
  });
  if (!res.ok) throw new Error(`Status update failed: ${res.status}`);
  return res.json();
}

// ── Queue ─────────────────────────────────────────────────────────────────────

export interface QueuePayload {
  multisigAddress: string;
  vaultAddress: string;
  proposalIndex?: number;
  to: string;
  amount: string;
  amountUSD?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  tokenIconUrl?: string;
  proposedBy?: string;
  screeningDisabled?: boolean;
}

export interface QueueResponse {
  success: boolean;
  id: string;
  risk?: { riskScore: number; verdict: string; reasons: string[] };
  autoApproved?: boolean;
  signature?: string;
}

export async function postQueue(payload: QueuePayload, token?: string): Promise<QueueResponse> {
  const res = await fetch(`${API_URL}/queue`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `Queue failed: ${res.status}`);
  return data;
}

// ── Execute ───────────────────────────────────────────────────────────────────

export async function executeProposal(
  proposalId: string,
  token?: string
): Promise<{ signature?: string; status?: string }> {
  const res = await fetch(`${API_URL}/execute`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ proposalId }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `Execute failed: ${res.status}`);
  return data;
}
