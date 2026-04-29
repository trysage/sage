"use client";

import { useState } from "react";
import Image from "next/image";
import {
  RefreshCw, Bell, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plug,
  CheckCircle2, XCircle, FlaskConical,
} from "lucide-react";
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Sidebar } from "@/components/Sidebar";
import { AgentId } from "@/components/AgentId";
import { TokenRow } from "@/components/TokenRow";
import { TraceRow } from "@/components/TraceRow";
import { ActivityRow } from "@/components/ActivityRow";
import { useAuth } from "@/app/context/AuthContext";
import { proposeAndExecuteSponsored, loadSageAccount } from "@/lib/squads";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useTransactions } from "@/hooks/useTransactions";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

const TEST_AMOUNT = 0.0001 * LAMPORTS_PER_SOL;

type Tab = "assets" | "activity" | "nfts";

function formatHeroBalance(usd: number): { integer: string; decimal: string } {
  const [intPart, decPart = "00"] = usd.toFixed(2).split(".");
  const integer = `$${parseInt(intPart).toLocaleString("en-US")}`;
  return { integer, decimal: `.${decPart}` };
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

export default function HomePage() {
  const { user, wallet, getSolanaWallet } = useAuth();
  const portfolio = usePortfolio();
  const txHistory = useTransactions();

  const [activeTab, setActiveTab] = useState<Tab>("assets");
  const [sending, setSending] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleTestSend() {
    const solanaWallet = getSolanaWallet();
    if (!solanaWallet || !wallet?.address) return;
    const account = loadSageAccount(wallet.address);
    if (!account) return;

    setSending(true);
    setTxSig(null);
    setSendError(null);

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const { vaultPda, multisigPda } = account;
      const ix = SystemProgram.transfer({
        fromPubkey: vaultPda,
        toPubkey: new PublicKey("5QSRmvpHimVhXh2YP622A61vaThB8ut2iWJW9DPmCTNj"),
        lamports: TEST_AMOUNT,
      });
      const sig = await proposeAndExecuteSponsored(connection, solanaWallet, multisigPda, [ix], "test: 0.0001 SOL");
      setTxSig(sig);
    } catch (e) {
      console.error("Error sending test tx:", e);
      setSendError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  // ── Hero balance ──────────────────────────────────────────────────────────
  const totalUsd = portfolio.data?.totalUsd ?? null;
  const pct = portfolio.data?.percentChange24h ?? null;
  const { integer: balInt, decimal: balDec } = totalUsd != null
    ? formatHeroBalance(totalUsd)
    : { integer: "$--,---", decimal: ".--" };

  const deltaUsd = totalUsd != null && pct != null
    ? totalUsd * (pct / (100 + pct))
    : null;

  const greeting = user?.name ? `gm, ${user.name.split(" ")[0]}` : "gm";

  // ── Tab counts ────────────────────────────────────────────────────────────
  const tokenCount = portfolio.data?.tokens.length ?? 0;
  const activityCount = txHistory.data.length;

  return (
    <div className="app-shell">
      <div className="ambient" />

      <Sidebar />

      {/* ── Main content ── */}
      <main className="main">
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

        {/* Hero balance */}
        <section className="hero-bal">
          <span className="lbl">{greeting}</span>
          <div className="num">
            {balInt}<em>{balDec}</em>
          </div>
          {pct != null && deltaUsd != null ? (
            <div className="delta">
              <span className={pct >= 0 ? "up" : "dn"}>
                {pct >= 0 ? "▲" : "▼"} {formatUSD(deltaUsd)} · {Math.abs(pct).toFixed(2)}%
              </span>
              <span className="meta">24 hours</span>
            </div>
          ) : (
            <div className="delta">
              <span className="meta">24 hours</span>
            </div>
          )}
        </section>

        {/* Action quad */}
        <div className="quad">
          <button className="qb">
            <span className="qb-ic"><ArrowUpRight size={16} /></span>
            Send
          </button>
          <button className="qb">
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
        </div>

        {/* Test transfer */}
        <div className="test-send">
          <div className="test-send-label">
            <FlaskConical size={13} />
            Test vault transfer · 0.0001 SOL → your wallet
          </div>
          <button
            className="test-send-btn"
            onClick={handleTestSend}
            disabled={sending || !wallet}
          >
            {sending ? "Sending…" : "Send test tx"}
          </button>
          {txSig && (
            <div className="test-send-result ok">
              ✓ Confirmed ·{" "}
              <a href={`https://explorer.solana.com/tx/${txSig}`} target="_blank" rel="noreferrer">
                {txSig.slice(0, 16)}…
              </a>
            </div>
          )}
          {sendError && (
            <div className="test-send-result err">{sendError}</div>
          )}
        </div>

        {/* Segment tabs */}
        <div className="seg-tabs">
          <div
            className={`seg${activeTab === "assets" ? " on" : ""}`}
            onClick={() => setActiveTab("assets")}
          >
            Assets{" "}
            <span className="ct">{portfolio.loading ? "…" : tokenCount}</span>
          </div>
          <div
            className={`seg${activeTab === "activity" ? " on" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            Activity{" "}
            <span className="ct">{txHistory.loading ? "…" : activityCount}</span>
          </div>
          <div
            className={`seg${activeTab === "nfts" ? " on" : ""}`}
            onClick={() => setActiveTab("nfts")}
          >
            NFTs <span className="ct">0</span>
          </div>
        </div>

        {/* Tab pane */}
        <div className="tab-pane">
          {/* ── Assets ── */}
          {activeTab === "assets" && (
            <div className="t-list">
              {portfolio.loading && (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              )}
              {!portfolio.loading && portfolio.error && (
                <div className="tab-empty">{portfolio.error}</div>
              )}
              {!portfolio.loading && !portfolio.error && tokenCount === 0 && (
                <div className="tab-empty">No tokens in this vault yet</div>
              )}
              {!portfolio.loading && portfolio.data?.tokens.map((token) => (
                <TokenRow
                  key={token.id}
                  name={token.name}
                  symbol={token.symbol}
                  iconUrl={token.iconUrl}
                  amount={formatBalance(token.balance, token.symbol)}
                  price={formatPrice(token.price)}
                  value={token.usdValue != null ? formatUSD(token.usdValue) : "—"}
                />
              ))}
            </div>
          )}

          {/* ── Activity ── */}
          {activeTab === "activity" && (
            <div className="t-list">
              {txHistory.loading && (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              )}
              {!txHistory.loading && txHistory.error && (
                <div className="tab-empty">{txHistory.error}</div>
              )}
              {!txHistory.loading && !txHistory.error && activityCount === 0 && (
                <div className="tab-empty">No transactions yet</div>
              )}
              {!txHistory.loading && txHistory.data.map((tx) => (
                <ActivityRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}

          {/* ── NFTs ── */}
          {activeTab === "nfts" && (
            <div className="t-list">
              <div className="tab-empty">NFTs coming soon</div>
            </div>
          )}
        </div>
      </main>

      {/* ── Right rail ── */}
      <aside className="rail">
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
            <span className="pill watch">
              <span className="dot" />
              REVIEW
            </span>
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
            <button className="approve">
              <CheckCircle2 size={14} /> Approve
            </button>
            <button className="deny">
              <XCircle size={14} /> Deny
            </button>
          </div>
        </div>

        <div className="rail-h2">
          <span>Recent decisions</span>
          <a>View all</a>
        </div>

        <div className="stream">
          <TraceRow ts="00:14:02" pill="safe"   label="PASS"  title="Swap on Jupiter"   meta="0.84 SOL → 132 USDC · within band" />
          <TraceRow ts="00:11:48" pill="safe"   label="PASS"  title="Stake to Jito"     meta="5 SOL · routine" />
          <TraceRow ts="00:08:21" pill="danger" label="BLOCK" title="Drainer signature" meta="DRA1…nrZk · simulated −all SOL" />
          <TraceRow ts="00:02:55" pill="safe"   label="PASS"  title="USDC to Coinbase"  meta="120 USDC · seen 8× before" />
          <TraceRow ts="yesterday" pill="watch" label="HELD"  title="New site connected" meta="jup.ag · read-only · approved by you" />
        </div>
      </aside>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="skel-row">
      <div className="skel-circle" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skel-line" style={{ width: "40%" }} />
        <div className="skel-line" style={{ width: "25%" }} />
      </div>
      <div className="skel-line" style={{ width: 72 }} />
    </div>
  );
}
