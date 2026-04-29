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
  address: string;
  chain: { id: string; chainId: number; name: string };
  verified: boolean;
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
