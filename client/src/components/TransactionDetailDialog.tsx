"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Zap, Copy, Check, ShieldX } from "lucide-react";
import { Dialog } from "./Dialog";
import { PendingAnimation } from "./animations/PendingAnimation";
import { SuccessAnimation } from "./animations/SuccessAnimation";
import { formatUSD } from "@/lib/format";
import type { TransactionItem } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDatetime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " · "
    + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function truncShort(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button type="button" className="txdlg-copy" onClick={handle} aria-label="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function TokenAvatar({ iconUrl, symbol }: { iconUrl: string | null; symbol: string | null }) {
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt={symbol ?? ""}
        className="txdlg-ico-img"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return <span className="txdlg-ico-sym">{(symbol ?? "?").slice(0, 1)}</span>;
}

function VerdictPill({ verdict }: { verdict: "APPROVE" | "REVIEW" | "BLOCK" }) {
  if (verdict === "APPROVE") return <span className="pill safe">Approved by Sage</span>;
  if (verdict === "BLOCK")   return <span className="pill danger">Blocked by Sage</span>;
  return <span className="pill watch">Flagged for Review</span>;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="txdlg-row">
      <span className="txdlg-row-label">{label}</span>
      <span className="txdlg-row-val">{children}</span>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface TransactionDetailDialogProps {
  open: boolean;
  onClose: () => void;
  tx: TransactionItem | null;
}

export function TransactionDetailDialog({ open, onClose, tx }: TransactionDetailDialogProps) {
  const dir = tx?.direction ?? "send";
  const op = tx?.operationType ?? "send";
  const isTrade = op === "trade";
  const isReceive = dir === "receive";
  const isExecuted = tx?.status === "executed";
  const isBlocked = tx?.status === "blocked" || tx?.riskVerdict === "BLOCK";
  const isPending = !isExecuted && !isBlocked;

  let dirClass = isReceive ? "receive" : "send";
  if (isTrade) dirClass = "trade";

  let DirIcon = isReceive ? ArrowDownLeft : ArrowUpRight;
  if (isTrade) DirIcon = ArrowLeftRight;
  if (op === "execute") DirIcon = Zap;

  const label = tx
    ? isTrade && tx.tradeReceived
      ? `Swap ${tx.tokenSymbol ?? ""} → ${tx.tradeReceived.symbol}`
      : capitalize(op)
    : "";

  const explorerHref = tx?.txSignature
    ? `https://explorer.solana.com/tx/${tx.txSignature}`
    : null;

  return (
    <Dialog open={open} onClose={onClose} title="Transaction">
      <AnimatePresence mode="wait">
        {tx && (
          <motion.div
            key={tx.id}
            className="txdlg-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Status animation — centered */}
            <div className="txdlg-anim">
              {isExecuted && <SuccessAnimation size={80} loop={false} />}
              {isPending   && <PendingAnimation size={80} />}
              {isBlocked   && (
                <div className="txdlg-blocked-ico">
                  <ShieldX size={32} />
                </div>
              )}
              <span className={`txdlg-status-label ${isExecuted ? "safe" : isBlocked ? "danger" : "watch"}`}>
                {isExecuted ? "Executed" : isBlocked ? "Blocked" : "Pending Review"}
              </span>
            </div>

            {/* Amount block — token icon + direction badge + amount */}
            <div className="txdlg-amount-block">
              <div className="txdlg-amount-ico-wrap">
                <div className="txdlg-ico">
                  <TokenAvatar iconUrl={tx.tokenIconUrl} symbol={tx.tokenSymbol} />
                </div>

              </div>
              <div className="txdlg-amount-text">
                <span className="txdlg-op-label">
                  <DirIcon size={11} className={`txdlg-dir-ico ${dirClass}`} />
                  {label}
                </span>
                <div className="txdlg-amount-row">
                  {tx.amount && tx.tokenSymbol && (
                    <span className={`txdlg-amount ${isReceive ? "in" : ""}`}>
                      {isReceive ? "+" : "−"}{tx.amount} {tx.tokenSymbol}
                    </span>
                  )}
                  {tx.valueUSD != null && (
                    <span className="txdlg-amount-usd">{formatUSD(tx.valueUSD)}</span>
                  )}
                </div>
                {isTrade && tx.tradeReceived && (
                  <div className="txdlg-trade-received">
                    <div className="txdlg-ico txdlg-ico-sm">
                      <TokenAvatar iconUrl={tx.tradeReceived.iconUrl} symbol={tx.tradeReceived.symbol} />
                    </div>
                    <span>+{tx.tradeReceived.amount} {tx.tradeReceived.symbol}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detail rows — no dividers */}
            <div className="txdlg-rows">
              {tx.to && (
                <DetailRow label={isReceive ? "From" : "To"}>
                  <span className="txdlg-addr">{truncShort(tx.to)}</span>
                  <CopyButton text={tx.to} />
                </DetailRow>
              )}

              <DetailRow label="Proposed">
                {fmtDatetime(tx.proposedAt)}
              </DetailRow>

              {tx.executedAt && (
                <DetailRow label="Executed">
                  {fmtDatetime(tx.executedAt)}
                </DetailRow>
              )}

              {tx.riskVerdict && (
                <DetailRow label="Sage verdict">
                  <VerdictPill verdict={tx.riskVerdict} />
                </DetailRow>
              )}

              {tx.proposalIndex != null && (
                <DetailRow label="Proposal #">
                  {String(tx.proposalIndex)}
                </DetailRow>
              )}

              {tx.txSignature && (
                <DetailRow label="Signature">
                  <span className="txdlg-addr">{truncShort(tx.txSignature)}</span>
                  <CopyButton text={tx.txSignature} />
                </DetailRow>
              )}
            </div>

            {/* Explorer link */}
            {explorerHref && (
              <a
                href={explorerHref}
                target="_blank"
                rel="noreferrer"
                className="txdlg-explorer"
              >
                View on Explorer <ArrowUpRight size={13} />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
