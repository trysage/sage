import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Zap } from "lucide-react";
import { formatUSD } from "@/lib/format";
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


function TokenAvatar({ iconUrl, symbol }: { iconUrl: string | null; symbol: string | null }) {
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={iconUrl} alt="" className="act-ico-img" />
    );
  }
  return <span className="act-ico-sym">{(symbol || "?").slice(0, 5)}</span>;
}

interface ActivityRowProps {
  tx: TransactionItem;
  formattedTime?: string;
  onClick?: () => void;
}

export function ActivityRow({ tx, formattedTime, onClick }: ActivityRowProps) {
  const dir = tx.direction ?? (tx.status === "executed" ? "send" : "send");
  const op = tx.operationType ?? "send";
  const isTrade = op === "trade";
  const isReceive = dir === "receive";

  let dirClass = isReceive ? "receive" : "send";
  if (isTrade) dirClass = "trade";

  let DirIcon = isReceive ? ArrowDownLeft : ArrowUpRight;
  if (isTrade) DirIcon = ArrowLeftRight;
  if (op === "execute") DirIcon = Zap;

  const symbol = tx.tokenSymbol ?? "";
  const label = isTrade && tx.tradeReceived
    ? `Swap ${symbol} → ${tx.tradeReceived.symbol}`
    : capitalize(op);

  const counterparty = isReceive ? tx.to : tx.to;
  const ts = tx.executedAt ?? tx.proposedAt;

  const amountDisplay = tx.amount && symbol
    ? `${tx.amount} ${symbol}`
    : tx.amount ?? "";

  const usdDisplay = formatUSD(tx.valueUSD);

  return (
    <div className="act-row" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className="act-ico"><TokenAvatar iconUrl={tx.tokenIconUrl} symbol={tx.tokenSymbol} /></div>

      <div className="act-body">
        <span className="act-title">
          <DirIcon className={`act-dir-ico ${dirClass}`} size={12} />
          <span className="act-title-text">{label || "Transaction"}</span>
        </span>
        <span className="act-sub">
          {counterparty ? `${isReceive ? "From" : "To"} ${truncate(counterparty)}` : truncate(tx.txSignature)}
          {" · "}
          {formattedTime ?? relativeTime(ts)}
        </span>
      </div>

      <div className="act-right">
        {amountDisplay && (
          <span className={`act-amount ${isReceive ? "in" : ""}`}>
            {isReceive ? "+" : "-"}{amountDisplay}
          </span>
        )}
        {(tx.inReview || tx.status === "pending")
          ? <span className="act-review-pill"><span className="dot" />Review</span>
          : (tx.status === "blocked" || tx.riskVerdict === "BLOCK")
          ? <span className="act-blocked-pill"><span className="dot" />Blocked</span>
          : usdDisplay && <span className="act-usd">{usdDisplay}</span>
        }
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
