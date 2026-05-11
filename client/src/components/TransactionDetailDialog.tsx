"use client";

import { useState, useEffect } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Zap, Copy, Check, ShieldX, XCircle, ChevronDown } from "lucide-react";
import { Dialog } from "./Dialog";
import { PendingAnimation } from "./animations/PendingAnimation";
import { SuccessAnimation } from "./animations/SuccessAnimation";
import { RejectedAnimation } from "./animations/RejectedAnimation";
import { InlineSpinner } from "./loaders/InlineSpinner";
import { formatTokenAmount, formatUSD } from "@/lib/format";
import { useExplorer } from "@/app/context/ExplorerContext";
import { useAuth } from "@/app/context/AuthContext";
import { cancelProposalSponsored } from "@/lib/squads";
import { patchTransaction, closeProposalAccounts } from "@/lib/api";
import { useEnableCancel } from "@/hooks/useAppSettings";
import type { TransactionItem } from "@/lib/api";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

type CancelState = "idle" | "cancelling" | "error";

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
  onCancelSuccess?: () => void;
}

export function TransactionDetailDialog({ open, onClose, tx, onCancelSuccess }: TransactionDetailDialogProps) {
  const { txUrl } = useExplorer();
  const { getSolanaWallet, identityToken } = useAuth();
  const [cancelEnabled] = useEnableCancel();
  const [cancelState, setCancelState] = useState<CancelState>("idle");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [analysisOpen, setAnalysisOpen] = useState(false);

  useEffect(() => {
    setCancelState("idle");
    setCancelError(null);
    setAnalysisOpen(false);
  }, [tx?.id]);

  const canCancel =
    cancelEnabled &&
    tx != null &&
    (tx.inReview || tx.status === "pending" || tx.status === "rejected") &&
    tx.multisigAddress != null &&
    tx.multisigAddress !== "" &&
    tx.proposalIndex != null;

  async function handleCancel() {
    if (!tx || !canCancel) return;
    const solanaWallet = getSolanaWallet();
    if (!solanaWallet) { setCancelError("Wallet not connected"); return; }

    setCancelState("cancelling");
    setCancelError(null);
    try {
      const connection = new Connection(RPC_URL, "confirmed");
      await cancelProposalSponsored(
        connection,
        solanaWallet,
        new PublicKey(tx.multisigAddress!),
        BigInt(tx.proposalIndex!),
        identityToken ?? undefined
      );
      if (tx.status !== "rejected") {
        await patchTransaction(tx.id, "reject", "Cancelled by owner", identityToken ?? undefined);
      }
      // fire-and-forget rent reclaim
      closeProposalAccounts(tx.multisigAddress!, tx.proposalIndex!, identityToken ?? undefined)
        .catch((e) => console.warn("[close] rent reclaim failed:", e));
      onCancelSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setCancelError(msg.length > 120 ? msg.slice(0, 120) + "…" : msg);
      setCancelState("error");
    }
  }

  const dir = tx?.direction ?? "send";
  const op = tx?.operationType ?? "send";
  const isTrade = op === "trade";
  const isReceive = dir === "receive";
  const isExecuted = tx?.status === "executed";
  const isBlocked  = tx?.status === "blocked" || tx?.riskVerdict === "BLOCK";
  const isRejected = tx?.status === "rejected";
  const isPending  = !isExecuted && !isBlocked && !isRejected;

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

  const explorerHref = tx?.txSignature ? txUrl(tx.txSignature) : null;

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
              {isExecuted  && <SuccessAnimation size={80} loop={false} />}
              {isPending   && <PendingAnimation size={80} />}
              {isBlocked   && (
                <div className="txdlg-blocked-ico">
                  <ShieldX size={32} />
                </div>
              )}
              {isRejected  && <RejectedAnimation size={80} />}
              <span className={`txdlg-status-label ${isExecuted ? "safe" : isBlocked ? "danger" : isRejected ? "muted" : "watch"}`}>
                {isExecuted ? "Executed" : isBlocked ? "Blocked" : isRejected ? "Rejected" : "Pending Review"}
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
                      {isReceive ? "+" : "−"}{formatTokenAmount(tx.amount, { raw: true })} {tx.tokenSymbol}
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

              {tx.txSignature && (
                <DetailRow label="Signature">
                  <span className="txdlg-addr">{truncShort(tx.txSignature)}</span>
                  <CopyButton text={tx.txSignature} />
                </DetailRow>
              )}
            </div>

            {/* Analysis — expandable, initially closed */}
            {(tx.riskVerdict || tx.riskScore != null || (tx.riskReasons && tx.riskReasons.length > 0) || tx.reviewReason || tx.rejectReason) && (
              <div className="txdlg-analysis">
                <button
                  type="button"
                  className="txdlg-analysis-toggle"
                  onClick={() => setAnalysisOpen((v) => !v)}
                  aria-expanded={analysisOpen}
                >
                  <span>View analysis</span>
                  <ChevronDown size={14} className={`txdlg-analysis-chev ${analysisOpen ? "open" : ""}`} />
                </button>
                {analysisOpen && (
                  <div className="txdlg-analysis-body">
                    {tx.riskScore != null && (
                      <div className="txdlg-analysis-score">
                        <div className="txdlg-analysis-score-head">
                          <span className="txdlg-analysis-score-label">Risk score</span>
                          <span className={`txdlg-analysis-score-val ${
                            tx.riskScore >= 70 ? "danger" : tx.riskScore >= 40 ? "watch" : "safe"
                          }`}>{tx.riskScore}<em>/100</em></span>
                        </div>
                        <div className="txdlg-analysis-bar">
                          <span
                            className={`txdlg-analysis-bar-fill ${
                              tx.riskScore >= 70 ? "danger" : tx.riskScore >= 40 ? "watch" : "safe"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, tx.riskScore))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {tx.reviewReason && (
                      <div className="txdlg-analysis-block">
                        <span className="txdlg-analysis-block-label">Message</span>
                        <p className="txdlg-analysis-msg">{tx.reviewReason}</p>
                      </div>
                    )}

                    {tx.rejectReason && (
                      <div className="txdlg-analysis-block">
                        <span className="txdlg-analysis-block-label">Rejection reason</span>
                        <p className="txdlg-analysis-msg danger">{tx.rejectReason}</p>
                      </div>
                    )}

                    {tx.riskReasons && tx.riskReasons.length > 0 && (
                      <div className="txdlg-analysis-block">
                        <span className="txdlg-analysis-block-label">Signals</span>
                        <ul className="txdlg-analysis-reasons">
                          {tx.riskReasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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

            {/* Cancel button — only for in-review proposals the user can cancel */}
            {canCancel && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="txdlg-cancel-btn"
                  onClick={handleCancel}
                  disabled={cancelState === "cancelling"}
                >
                  {cancelState === "cancelling" ? <InlineSpinner /> : <XCircle size={14} />}
                  {cancelState === "cancelling" ? "Cancelling…" : "Cancel Transaction"}
                </button>
                {cancelState === "error" && cancelError && (
                  <p className="txdlg-cancel-err">{cancelError}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
