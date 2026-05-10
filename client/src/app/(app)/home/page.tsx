"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Bell, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plug,
  ShieldOff, Settings,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AgentId } from "@/components/AgentId";
import { TokenRow } from "@/components/TokenRow";
import { TraceRow } from "@/components/TraceRow";
import { ActivityList } from "@/components/ActivityList";
import { ReceiveDialog } from "@/components/ReceiveDialog";
import { SendDialog } from "@/components/SendDialog";
import { TokenDetailDialog } from "@/components/TokenDetailDialog";
import { TransactionDetailDialog } from "@/components/TransactionDetailDialog";
import { AgentQuote } from "@/components/AgentQuote";
import { EmptyTransactions, EmptyNFTs, EmptyTokens } from "@/components/empty";
import { PendingAnimation } from "@/components/animations/PendingAnimation";
import { useAuth } from "@/app/context/AuthContext";
import { useScreeningStatus } from "@/app/context/ScreeningStatusContext";
import type { TokenPosition, TransactionItem } from "@/lib/api";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useTransactions } from "@/hooks/useTransactions";
import { useLiveProposal } from "@/hooks/useLiveProposal";
import { useRefreshAll } from "@/hooks/useRefreshAll";
import { padTokensWithFallbacks } from "@/lib/tokenFallbacks";
import { formatTokenAmount, formatUSD, formatPrice } from "@/lib/format";

type Tab = "assets" | "activity" | "nfts";

// ── Animation variants ────────────────────────────────────────────────────────

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, type: "spring" as const, bounce: 0.1 },
  },
};

// ── Formatters ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function truncAddr(addr: string) {
  return addr.length > 16 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function traceFromTx(tx: TransactionItem): { pill: "safe" | "watch" | "danger"; label: string; title: string; meta: string } {
  const op = tx.operationType ?? "send";
  const isTrade = op === "trade";
  const title = isTrade && tx.tradeReceived
    ? `Swap ${tx.tokenSymbol ?? ""} → ${tx.tradeReceived.symbol}`
    : tx.amount && tx.tokenSymbol
      ? `${op.charAt(0).toUpperCase() + op.slice(1)} ${formatTokenAmount(tx.amount, { raw: true })} ${tx.tokenSymbol}`
      : op.charAt(0).toUpperCase() + op.slice(1);

  const toStr = tx.to ? `→ ${truncAddr(tx.to)}` : "";
  const usdStr = tx.valueUSD ? ` · $${tx.valueUSD.toFixed(2)}` : "";
  const meta = [toStr, usdStr].filter(Boolean).join("") || "—";

  const verdict = tx.riskVerdict;
  if (verdict === "APPROVE" || tx.status === "executed") {
    return { pill: "safe", label: "PASS", title, meta };
  }
  if (verdict === "BLOCK" || tx.status === "blocked") {
    return { pill: "danger", label: "BLOCK", title, meta };
  }
  if (tx.status === "rejected") {
    return { pill: "danger", label: "REJECTED", title, meta };
  }
  return { pill: "watch", label: "REVIEW", title, meta };
}

function formatHeroBalance(usd: number): { integer: string; decimal: string } {
  const [intPart, decPart = "00"] = usd.toFixed(2).split(".");
  return { integer: `$${parseInt(intPart).toLocaleString("en-US")}`, decimal: `.${decPart}` };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, wallet, vaultPda, getSolanaWallet } = useAuth();
  const { isScreeningActive, fullyActivated, loading: screeningLoading } = useScreeningStatus();
  const portfolio = usePortfolio();
  const txHistory = useTransactions();
  const refreshAll = useRefreshAll(portfolio.refetch, txHistory.refetch);
  const pendingTx = txHistory.data.find(tx => tx.status === "pending" || tx.inReview);

  const [activeTab, setActiveTab] = useState<Tab>("assets");
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenPosition | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const selectedTx = txHistory.data.find(tx => tx.id === selectedTxId) ?? null;
  const isPendingTx = !selectedTx || selectedTx.status === "pending" || !!selectedTx.inReview;
  const liveProposal = useLiveProposal(selectedTxId && isPendingTx ? selectedTxId : null);
  const dialogTx = liveProposal ?? selectedTx;
  // ── Derived values ────────────────────────────────────────────────────────
  const totalUsd = portfolio.data?.totalUsd ?? null;
  const pct = portfolio.data?.percentChange24h ?? null;
  const { integer: balInt, decimal: balDec } = totalUsd != null
    ? formatHeroBalance(totalUsd)
    : { integer: "$--,---", decimal: ".--" };
  const deltaUsd = totalUsd != null && pct != null
    ? totalUsd * (pct / (100 + pct))
    : null;
  const greeting = user?.name ? `gm, ${user.name.split(" ")[0]}` : "gm";
  const displayTokens = padTokensWithFallbacks(portfolio.data?.tokens ?? []);
  const tokenCount = portfolio.data?.tokens.length ?? 0;
  const activityCount = txHistory.data.length;

  return (
    <div className="app-shell">
      <div className="ambient" />

      <Sidebar />

      {/* ── Main ── */}
      <main className="main">

        {/* Top bar */}
        <div className="main-top">
          <img src="/sage-mark-mint.png" alt="Sage" className="mobile-logo" />
          <AgentId />
          <div className="right">
            <span className="sync-label">
              {portfolio.loading ? "Syncing…" : "Live"}
            </span>
            <button
              className="ico-btn sync-label"
              title="Refresh"
              onClick={() => { portfolio.refetch(); txHistory.refetch(); }}
            >
              <RefreshCw size={14} />
            </button>
            <button className="ico-btn" title="Notifications">
              <Bell size={14} />
            </button>
          </div>
        </div>

        {/* ── Hero balance ── */}
        <section className="hero-bal">
          <motion.span
            className="lbl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {greeting}
          </motion.span>

          <motion.div
            className="num"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, type: "spring", bounce: 0.15 }}
          >
            {balInt}<em>{balDec}</em>
          </motion.div>

          <motion.div
            className="delta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            {pct != null && deltaUsd != null ? (
              <span className={pct >= 0 ? "up" : "dn"}>
                {pct >= 0 ? "▲" : "▼"} {formatUSD(deltaUsd) ?? ""} · {Math.abs(pct).toFixed(2)}%
              </span>
            ) : null}
            <span className="meta">24 hours</span>
          </motion.div>
        </section>

        {/* ── Action quad ── */}
        <motion.div
          className="quad"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, type: "spring", bounce: 0.1 }}
        >
          <button className="qb" onClick={() => setShowSend(true)}>
            <span className="qb-ic"><ArrowUpRight size={16} /></span>
            Send
          </button>
          <button className="qb" onClick={() => setShowReceive(true)}>
            <span className="qb-ic"><ArrowDownLeft size={16} /></span>
            Receive
          </button>
          <button className="qb">
            <span className="qb-ic"><ArrowLeftRight size={16} /></span>
            Swap
          </button>
          <button className="qb">
            <span className="qb-ic"><Plug size={16} /></span>
            Connect
          </button>
        </motion.div>

        {/* ── Segment tabs ── */}
        <motion.div
          className="seg-tabs"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.35 }}
        >
          {(["assets", "activity", "nfts"] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = { assets: "Assets", activity: "Activity", nfts: "NFTs" };
            const counts: Record<Tab, string | number> = {
              assets: portfolio.loading ? "…" : tokenCount,
              activity: txHistory.loading ? "…" : activityCount,
              nfts: 0,
            };
            return (
              <div
                key={tab}
                className={`seg${activeTab === tab ? " on" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {labels[tab]} <span className="ct">{counts[tab]}</span>
                {activeTab === tab && (
                  <motion.span
                    className="seg-indicator"
                    layoutId="sage-tab-indicator"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* ── Tab pane ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="tab-pane"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >

            {/* Assets */}
            {activeTab === "assets" && (
              <div className="t-list">
                {portfolio.loading && <SkeletonRows count={4} />}
                {!portfolio.loading && portfolio.error && (
                  <EmptyState message={portfolio.error} />
                )}
                {!portfolio.loading && !portfolio.error && tokenCount === 0 && !displayTokens.length && (
                  <EmptyTokens onCta={() => setShowReceive(true)} />
                )}
                {!portfolio.loading && (
                  <motion.div variants={listVariants} initial="hidden" animate="visible">
                    {displayTokens.map((token) => (
                      <motion.div key={token.id} variants={rowVariants}>
                        <TokenRow
                          name={token.name}
                          symbol={token.symbol}
                          iconUrl={token.iconUrl}
                          amount={`${formatTokenAmount(token.balance, { raw: true })} ${token.symbol}`}
                          price={token.price > 0 ? formatPrice(token.price) : "—"}
                          value={formatUSD(token.usdValue) ?? "—"}
                          percentChange1d={token.pricePercentChange1d}
                          dollarChange1d={token.priceChange1d}
                          placeholder={token.placeholder}
                          onClick={token.tokenId ? () => setSelectedToken(token) : undefined}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* Activity */}
            {activeTab === "activity" && (
              <div className="t-list">
                {txHistory.loading && <SkeletonRows count={4} />}
                {!txHistory.loading && txHistory.error && (
                  <EmptyState message={txHistory.error} />
                )}
                {!txHistory.loading && !txHistory.error && activityCount === 0 && (
                  <EmptyTransactions onCta={() => setShowSend(true)} />
                )}
                {!txHistory.loading && txHistory.data.length > 0 && (
                  <ActivityList transactions={txHistory.data} onSelect={(tx) => setSelectedTxId(tx.id)} />
                )}
              </div>
            )}

            {/* NFTs */}
            {activeTab === "nfts" && (
              <div className="t-list">
                <EmptyNFTs />
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </main>

      {/* ── Right rail ── */}
      <motion.aside
        className="rail"
        style={!screeningLoading && !isScreeningActive ? {
          background: "radial-gradient(ellipse at 50% -10%, rgba(240,179,60,.04), transparent 50%), var(--ink-900)",
        } : undefined}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5, type: "spring", bounce: 0.1 }}
      >
        <div className="rail-head">
          <span className="title">
            <Image src="/sage-mark-mint.png" alt="Sage" width={18} height={18} />
            Sage ·
          </span>
          <AnimatePresence mode="wait">
            {screeningLoading ? (
              <motion.span
                key="loading"
                className="pulse"
                style={{ color: "var(--ink-500)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="dot" style={{ background: "var(--ink-500)", animation: "none", boxShadow: "none" }} />
                SYNCING
              </motion.span>
            ) : isScreeningActive ? (
              <motion.span
                key="watching"
                className="pulse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="dot" />
                WATCHING
              </motion.span>
            ) : (
              <motion.span
                key="inactive"
                className="pulse"
                style={{ color: "var(--watch)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="dot" style={{ background: "var(--watch)", animation: "none", boxShadow: "0 0 8px var(--watch)" }} />
                INACTIVE
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {isScreeningActive ? (
            <motion.div
              key="quote-active"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <AgentQuote hasPending={!!pendingTx} />
            </motion.div>
          ) : (
            <motion.p
              key="quote-inactive"
              className="rail-quote"
              style={{ color: "var(--ink-300)" }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {!screeningLoading && (fullyActivated
                ? "Screening is paused. Transactions execute without AI review."
                : "Setup incomplete. Link Telegram to enable protection.")}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isScreeningActive ? (
            <AnimatePresence mode="wait">
              {pendingTx ? (
                <motion.div
                  key="pending-real"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="pending" onClick={() => setSelectedTxId(pendingTx.id)} style={{ cursor: "pointer" }}>
                    <div className="ph">
                      <span className="pill watch"><span className="dot" />REVIEW</span>
                      <span className="when">{timeAgo(pendingTx.proposedAt)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <PendingAnimation size={48} />
                      <div>
                        <div className="who">
                          {pendingTx.amount && pendingTx.tokenSymbol
                            ? `Send ${formatTokenAmount(pendingTx.amount, { raw: true })} ${pendingTx.tokenSymbol}`
                            : "Pending transaction"}
                        </div>
                        {pendingTx.to && (
                          <div className="addr">{truncAddr(pendingTx.to)}</div>
                        )}
                        {(pendingTx.amount && pendingTx.tokenSymbol && pendingTx.valueUSD) && (
                          <span className="amt">
                            {pendingTx.amount && pendingTx.tokenSymbol ? `${formatTokenAmount(pendingTx.amount, { raw: true })} ${pendingTx.tokenSymbol}` : ""}
                            {formatUSD(pendingTx.valueUSD)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="reason">
                      <em>Sage:</em> This transaction needs your approval on TG. Communicate with the Sage on TG to approve or block the transaction.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="pending-empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <RailScanPlaceholder />
                </motion.div>
              )}
            </AnimatePresence>
          ) : !screeningLoading ? (
            <motion.div
              key="inactive-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{
                background: "rgba(240,179,60,.05)",
                border: "1px solid rgba(240,179,60,.14)",
                borderRadius: 18,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "rgba(240,179,60,.1)", color: "var(--watch)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ShieldOff size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ink-0)" }}>
                    Guard inactive
                  </p>
                  <p style={{ margin: 0, marginTop: 2, fontSize: 11.5, color: "var(--ink-300)" }}>
                    {fullyActivated ? "Screening paused by you" : "Telegram not connected"}
                  </p>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-300)", lineHeight: 1.55 }}>
                {fullyActivated
                  ? "Transactions are executing immediately without AI review."
                  : "Complete setup to let Sage screen transactions before they execute."}
              </p>
              <Link
                href="/settings"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "9px 14px", borderRadius: 10,
                  background: "rgba(240,179,60,.1)",
                  border: "1px solid rgba(240,179,60,.2)",
                  color: "var(--watch)",
                  fontSize: 12.5, fontWeight: 600,
                  textDecoration: "none",
                  transition: "background .15s",
                }}
              >
                <Settings size={13} />
                {fullyActivated ? "Enable Sage Guard" : "Complete Setup"}
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="rail-h2">
          <span>Recent decisions</span>
          <a>View all</a>
        </div>

        <motion.div
          className="stream"
          variants={listVariants}
          initial="hidden"
          animate="visible"
          transition={{ delayChildren: 0.4 }}
        >
          {txHistory.data
            .filter(tx => !tx.screeningDisabled)
            .slice(0, 10)
            .map(tx => ({
              tx,
              ts: timeAgo(tx.executedAt ?? tx.proposedAt),
              ...traceFromTx(tx),
            }))
            .map(({ tx, ts, pill, label, title, meta }) => (
              <motion.div key={tx.id} variants={rowVariants}>
                <TraceRow ts={ts} pill={pill} label={label} title={title} meta={meta} onClick={() => setSelectedTxId(tx.id)} />
              </motion.div>
            ))
          }
          {!txHistory.loading && txHistory.data.filter(tx => !tx.screeningDisabled).length === 0 && (
            <p style={{ fontSize: 12, color: "var(--ink-500)", textAlign: "center", margin: "12px 0" }}>
              No screened transactions yet
            </p>
          )}
        </motion.div>
      </motion.aside>

      <SendDialog
        open={showSend}
        onClose={() => setShowSend(false)}
        onSuccess={refreshAll}
        tokens={portfolio.data?.tokens ?? displayTokens}
      />

      <ReceiveDialog
        open={showReceive}
        onClose={() => setShowReceive(false)}
        address={vaultPda}
      />

      <TokenDetailDialog
        open={selectedToken !== null}
        onClose={() => setSelectedToken(null)}
        token={selectedToken}
      />

      <TransactionDetailDialog
        open={selectedTxId !== null}
        onClose={() => setSelectedTxId(null)}
        tx={dialogTx}
        onCancelSuccess={() => { setSelectedTxId(null); txHistory.refetch(); }}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RailScanPlaceholder() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 16, padding: "20px 0",
    }}>
      {/* Sonar animation */}
      <div style={{ position: "relative", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "1px solid rgba(91,209,142,.4)",
            }}
            animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
          />
        ))}
        <motion.div
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(91,209,142,.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sage-mark-mint.png" alt="" style={{ width: 22, height: 22, opacity: 0.85 }} />
        </motion.div>
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-200)", margin: 0 }}>
          Examining your onchain moves
        </p>
        <p style={{ fontSize: 11.5, color: "var(--ink-500)", margin: "4px 0 0", lineHeight: 1.5 }}>
          No pending transactions right now
        </p>
      </div>
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} variants={rowVariants}>
          <div className="skel-row">
            <div className="skel-circle" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="skel-line" style={{ width: "40%" }} />
              <div className="skel-line" style={{ width: "25%" }} />
            </div>
            <div className="skel-line" style={{ width: 72 }} />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      className="tab-empty"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      {message}
    </motion.div>
  );
}
