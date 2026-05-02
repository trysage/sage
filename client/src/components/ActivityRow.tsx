import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Zap } from "lucide-react";
import type { TransactionItem } from "@/lib/api";

function truncate(addr: string | null): string {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatUSD(n: number | null | undefined): string | null {
  if (n == null) return null;
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ActivityRowProps {
  tx: TransactionItem;
}

export function ActivityRow({ tx }: ActivityRowProps) {
  const dir = tx.direction ?? (tx.status === "executed" ? "send" : "send");
  const op = tx.operationType ?? "send";
  const isTrade = op === "trade";
  const isReceive = dir === "receive";

  let dirClass = isReceive ? "receive" : "send";
  if (isTrade) dirClass = "trade";

  let icon = isReceive
    ? <ArrowDownLeft size={16} />
    : <ArrowUpRight size={16} />;
  if (isTrade) icon = <ArrowLeftRight size={16} />;
  if (op === "execute") icon = <Zap size={16} />;

  const symbol = tx.tokenSymbol ?? "";
  const label = isTrade && tx.tradeReceived
    ? `Swap ${symbol} → ${tx.tradeReceived.symbol}`
    : `${capitalize(op)}${symbol ? ` ${symbol}` : ""}`;

  const counterparty = isReceive ? tx.to : tx.to;
  const ts = tx.executedAt ?? tx.proposedAt;

  const amountDisplay = tx.amount && symbol
    ? `${tx.amount} ${symbol}`
    : tx.amount ?? "";

  const usdDisplay = formatUSD(tx.valueUSD);

  const explorerHref = tx.txSignature
    ? `https://explorer.solana.com/tx/${tx.txSignature}`
    : null;

  return (
    <div className="act-row">
      <div className={`act-ico ${dirClass}`}>{icon}</div>

      <div className="act-body">
        <span className="act-title">{label || "Transaction"}</span>
        <span className="act-sub">
          {counterparty ? `${isReceive ? "From" : "To"} ${truncate(counterparty)}` : truncate(tx.txSignature)}
          {" · "}
          {relativeTime(ts)}
        </span>
      </div>

      <div className="act-right">
        {amountDisplay && (
          <span className={`act-amount ${isReceive ? "in" : ""}`}>
            {isReceive ? "+" : "-"}{amountDisplay}
          </span>
        )}
        {usdDisplay && <span className="act-usd">{usdDisplay}</span>}
        {explorerHref && (
          <a
            className="act-link"
            href={explorerHref}
            target="_blank"
            rel="noreferrer"
          >
            ↗
          </a>
        )}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
