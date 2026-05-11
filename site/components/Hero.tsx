import Image from 'next/image'
import s from './Hero.module.css'
import GuardianCard from './GuardianCard'

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
              <span className={s.w1}>Wise co&#8209;pilot</span>{' '}
              <span className={s.w2}>for every</span>{' '}
              <em className={s.w3}>Solana</em>
              {' '}<span className={s.w4}>move.</span>
            </h1>

            <p className={s.sub}>
              Sage acts as a intelligent personal agent that learns your transaction patterns, performs risk analysis so that you never make wrong moves.
            </p>

            <div className={s.ctaRow}>
              <a className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} href="https://app.heysage.me">
              Try Sage →
              </a>
              <a className={`${s.btn} ${s.btnGhost} ${s.btnLg}`} href="#how">
                See it think ↓
              </a>
            </div>
          </div>

          {/* Guardian card — animated */}
          <GuardianCard />
        </div>

        {/* Stats bar */}
        <div className={s.stats}>
          <div className={s.statItem}>
            <div className={s.statNum}>10<em>+</em></div>
            <div className={s.statLbl}>Security Tools</div>
          </div>
          <div className={s.statItem}>
            <div className={s.statNum}>24<em>/</em>7</div>
            <div className={s.statLbl}>Active</div>
          </div>
          <div className={s.statItem}>
            <div className={s.statNum}>0</div>
            <div className={s.statLbl}>Friction</div>
          </div>
          <div className={s.statItem}>
            <div className={s.statNum}>
              <Image src="/assets/squads-logo-white.svg" alt="Squads" width={160} height={42} style={{ objectFit: 'contain' }} />
            </div>
            <div className={s.statLbl}>Powered</div>
          </div>
        </div>
      </div>
    </section>
  )
}
