"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Bell, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plug,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AgentId } from "@/components/AgentId";
import { TokenRow } from "@/components/TokenRow";
import { TraceRow } from "@/components/TraceRow";
import { ActivityRow } from "@/components/ActivityRow";
import { ReceiveDialog } from "@/components/ReceiveDialog";
import { SendDialog } from "@/components/SendDialog";
import { TokenDetailDialog } from "@/components/TokenDetailDialog";
import { useAuth } from "@/app/context/AuthContext";
import type { TokenPosition } from "@/lib/api";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useTransactions } from "@/hooks/useTransactions";
import { padTokensWithFallbacks } from "@/lib/tokenFallbacks";

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

function formatHeroBalance(usd: number): { integer: string; decimal: string } {
  const [intPart, decPart = "00"] = usd.toFixed(2).split(".");
  return { integer: `$${parseInt(intPart).toLocaleString("en-US")}`, decimal: `.${decPart}` };
}

function formatUSD(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatBalance(balance: string, symbol: string): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return `0 ${symbol}`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M ${symbol}`;
  if (num >= 1_000) return `${num.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${symbol}`;
  return `${parseFloat(num.toFixed(6))} ${symbol}`;
}

function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price < 0.0001) return `$${price.toExponential(2)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, wallet, vaultPda, getSolanaWallet } = useAuth();
  const portfolio = usePortfolio();
  const txHistory = useTransactions();

  const [activeTab, setActiveTab] = useState<Tab>("assets");
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenPosition | null>(null);
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
                {pct >= 0 ? "▲" : "▼"} {formatUSD(deltaUsd)} · {Math.abs(pct).toFixed(2)}%
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
                  <EmptyState message="No tokens in this vault yet" />
                )}
                {!portfolio.loading && (
                  <motion.div variants={listVariants} initial="hidden" animate="visible">
                    {displayTokens.map((token) => (
                      <motion.div key={token.id} variants={rowVariants}>
                        <TokenRow
                          name={token.name}
                          symbol={token.symbol}
                          iconUrl={token.iconUrl}
                          amount={formatBalance(token.balance, token.symbol)}
                          price={token.price > 0 ? formatPrice(token.price) : "—"}
                          value={token.usdValue != null ? formatUSD(token.usdValue) : "—"}
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
                  <EmptyState message="No transactions yet" />
                )}
                {!txHistory.loading && txHistory.data.length > 0 && (
                  <motion.div variants={listVariants} initial="hidden" animate="visible">
                    {txHistory.data.map((tx) => (
                      <motion.div key={tx.id} variants={rowVariants}>
                        <ActivityRow tx={tx} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* NFTs */}
            {activeTab === "nfts" && (
              <div className="t-list">
                <EmptyState message="NFTs coming soon" />
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </main>

      {/* ── Right rail ── */}
      <motion.aside
        className="rail"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5, type: "spring", bounce: 0.1 }}
      >
        <div className="rail-head">
          <span className="title">
            <Image src="/sage-mark-mint.png" alt="Sage" width={18} height={18} />
            Sage · live
          </span>
          <span className="pulse">
            <span className="dot" />
            WATCHING
          </span>
        </div>

        <p className="rail-quote">
          "I review every signature so you don&#39;t have to.{" "}
          <em>One needs you now.</em>"
        </p>

        <div className="pending">
          <div className="ph">
            <span className="pill watch"><span className="dot" />REVIEW</span>
            <span className="when">2 min ago</span>
          </div>
          <div>
            <div className="who">Send to unknown wallet</div>
            <div className="addr">8Hk2…Tx9R</div>
            <div className="amt">−2.40 SOL · $396.00</div>
          </div>
          <p className="reason">
            <em>Sage:</em> First-time recipient, but the address was copied from a
            Telegram message you opened earlier. Holding for your tap.
          </p>
          <div className="acts">
            <button className="approve"><CheckCircle2 size={14} /> Approve</button>
            <button className="deny"><XCircle size={14} /> Deny</button>
          </div>
        </div>

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
          {[
            { ts: "00:14:02", pill: "safe"   as const, label: "PASS",  title: "Swap on Jupiter",    meta: "0.84 SOL → 132 USDC · within band" },
            { ts: "00:11:48", pill: "safe"   as const, label: "PASS",  title: "Stake to Jito",      meta: "5 SOL · routine" },
            { ts: "00:08:21", pill: "danger" as const, label: "BLOCK", title: "Drainer signature",  meta: "DRA1…nrZk · simulated −all SOL" },
            { ts: "00:02:55", pill: "safe"   as const, label: "PASS",  title: "USDC to Coinbase",   meta: "120 USDC · seen 8× before" },
            { ts: "yesterday",pill: "watch"  as const, label: "HELD",  title: "New site connected", meta: "jup.ag · read-only · approved by you" },
          ].map((row) => (
            <motion.div key={row.ts} variants={rowVariants}>
              <TraceRow {...row} />
            </motion.div>
          ))}
        </motion.div>
      </motion.aside>

      <SendDialog
        open={showSend}
        onClose={() => setShowSend(false)}
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
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
