import Image from "next/image";
import { RefreshCw, Bell, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plug, CheckCircle2, XCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AgentId } from "@/components/AgentId";
import { TokenRow } from "@/components/TokenRow";
import { TraceRow } from "@/components/TraceRow";

export default function HomePage() {
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
            <span className="sync-label">Last sync · 12s</span>
            <button className="ico-btn sync-label" title="Refresh">
              <RefreshCw size={14} />
            </button>
            <button className="ico-btn" title="Notifications">
              <Bell size={14} />
            </button>
          </div>
        </div>

        {/* Hero balance */}
        <section className="hero-bal">
          <span className="lbl">gm, Koshik</span>
          <div className="num">
            $24,892<em>.40</em>
          </div>
          <div className="delta">
            <span className="up">▲ $533.20 · 2.18%</span>
            <span className="meta">24 hours</span>
          </div>
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

        {/* Segment tabs */}
        <div className="seg-tabs">
          <div className="seg on">
            Tokens <span className="ct">5</span>
          </div>
          <div className="seg">
            Activity <span className="ct">142</span>
          </div>
          <div className="seg">
            NFTs <span className="ct">12</span>
          </div>
        </div>

        {/* Token list */}
        <div className="t-list">
          <TokenRow bg="sage" name="Sage"     symbol="SAGE" amount="124.18 SAGE" price="$67.84"      change="+4.2%"  changeUp value="$8,420.40" />
          <TokenRow bg="sol"  name="Solana"   symbol="SOL"  amount="38.40 SOL"   price="$162.40"     change="+2.1%"  changeUp value="$6,236.00" />
          <TokenRow bg="usdc" name="USD Coin" symbol="USDC" amount="6,200 USDC"  price="$1.00"       change="0.0%"            value="$6,200.00" />
          <TokenRow bg="jup"  name="Jupiter"  symbol="JUP"  amount="2,180 JUP"   price="$0.94"       change="+1.4%"  changeUp value="$2,049.20" />
          <TokenRow bg="bonk" name="Bonk"     symbol="BONK" amount="62.5M BONK"  price="$0.0000318"  change="−3.1%"           value="$1,986.80" />
        </div>
      </main>

      {/* ── Right rail: Sage live readout ── */}
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

        {/* Pending request */}
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

        {/* Recent decisions */}
        <div className="rail-h2">
          <span>Recent decisions</span>
          <a>View all</a>
        </div>

        <div className="stream">
          <TraceRow ts="00:14:02" pill="safe"   label="PASS"  title="Swap on Jupiter"    meta="0.84 SOL → 132 USDC · within band" />
          <TraceRow ts="00:11:48" pill="safe"   label="PASS"  title="Stake to Jito"      meta="5 SOL · routine" />
          <TraceRow ts="00:08:21" pill="danger" label="BLOCK" title="Drainer signature"  meta="DRA1…nrZk · simulated −all SOL" />
          <TraceRow ts="00:02:55" pill="safe"   label="PASS"  title="USDC to Coinbase"   meta="120 USDC · seen 8× before" />
          <TraceRow ts="yesterday" pill="watch" label="HELD"  title="New site connected" meta="jup.ag · read-only · approved by you" />
        </div>
      </aside>
    </div>
  );
}
