import Image from 'next/image'
import s from './Hero.module.css'

export default function Hero() {
  return (
    <section className={s.hero}>
      <div className={s.container}>
        <div className={s.inner}>
          {/* Left column */}
          <div>
            <span className={s.agentId}>
              <span className={s.av}>
                <Image src="/assets/sage-mark-mint.png" alt="" width={18} height={18} />
              </span>
              <span>Agent · online</span>
              <span className={s.live} />
            </span>

            <h1 className={s.heading}>
              Wisdom that{' '}
              <em>watches&nbsp;over</em>
              &nbsp;your wallet.
            </h1>

            <p className={s.sub}>
              Sage is a personal AI agent that co-signs every Solana transaction on your behalf —
              learning your patterns, weighing each call, and stepping in only when something is
              wrong.
            </p>

            <div className={s.ctaRow}>
              <a className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} href="#">
                Deploy your agent →
              </a>
              <a className={`${s.btn} ${s.btnGhost} ${s.btnLg}`} href="#how">
                See it think ↓
              </a>
            </div>
          </div>

          {/* Guardian card */}
          <aside className={s.guardian}>
            <div className={s.guardianHead}>
              <span className={s.guardianTitle}>
                <Image src="/assets/sage-mark-mint.png" alt="" width={22} height={22} />
                Sage · live readout
              </span>
              <span className={s.pulse}>
                <span className={s.pulseDot} />
                WATCHING
              </span>
            </div>

            <TxRow
              who="Jupiter Aggregator"
              addr="JUP4...vMSx"
              reason="Routine swap. Within your weekly band."
              amount="−0.84 SOL"
              sub="$148.20 · signed 14ms"
              status="safe"
              label="PASS"
            />
            <TxRow
              who="Unknown wallet"
              addr="7xKX...gQ4n"
              reason="First-time recipient. 4× your median outbound."
              amount="−4.20 SOL"
              sub="$740.00 · held 2m"
              status="watch"
              label="REVIEW"
            />
            <TxRow
              who="Suspect contract"
              addr="DRA1...nrZk"
              reason="Matches drainer fingerprint shared 6h ago."
              amount="−ALL SOL"
              sub="prevented"
              status="danger"
              label="BLOCK"
            />
          </aside>
        </div>

        {/* Stats bar */}
        <div className={s.stats}>
          <div className={s.statItem}>
            <div className={s.statNum}>
              2<em>/</em>2
            </div>
            <div className={s.statLbl}>Multisig</div>
          </div>
          <div className={s.statItem}>
            <div className={s.statNum}>
              24<em>/</em>7
            </div>
            <div className={s.statLbl}>Active</div>
          </div>
          <div className={s.statItem}>
            <div className={s.statNum}>0</div>
            <div className={s.statLbl}>Friction</div>
          </div>
          <div className={s.statItem}>
            <div className={s.statNum}>
              <em>Squads</em>
            </div>
            <div className={s.statLbl}>Powered</div>
          </div>
        </div>
      </div>
    </section>
  )
}

type TxStatus = 'safe' | 'watch' | 'danger'

function TxRow({
  who,
  addr,
  reason,
  amount,
  sub,
  status,
  label,
}: {
  who: string
  addr: string
  reason: string
  amount: string
  sub: string
  status: TxStatus
  label: string
}) {
  return (
    <div className={s.tx}>
      <div>
        <div className={s.txWho}>{who}</div>
        <div className={s.txAddr}>{addr}</div>
        <p className={s.txReason}>{reason}</p>
      </div>
      <div>
        <span className={s.txAmount}>
          {amount} <span className={s.txSub}>{sub}</span>
        </span>
        <div className={s.txPillWrap}>
          <span className={`${s.pill} ${s[status]}`}>
            <span className={s.pillDot} />
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}
