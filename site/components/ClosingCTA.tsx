import Image from 'next/image'
import s from './ClosingCTA.module.css'
import Reveal from './Reveal'

export default function ClosingCTA() {
  return (
    <section className={s.section} id="manifesto">
      <div className={s.container}>
        <Reveal className={s.mark}>
          <Image src="/assets/sage-mark-mint.png" alt="Sage" width={80} height={80} />
        </Reveal>

        <Reveal as="h2" className={s.h2} delay={100}>
          Wise enough to recognize you.<br />
          <em>Strict enough</em> to stop what isn&apos;t.
        </Reveal>

        <Reveal className={s.ctaRow} delay={200}>
          <a className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} href="https://app.heysage.me">
            Try Sage →
          </a>
          <a className={`${s.btn} ${s.btnGhost} ${s.btnLg}`} href="#">
            Read the Manifesto →
          </a>
        </Reveal>

        <Reveal className={s.partners} delay={300}>
          <span className={s.partnersLabel}>Built with</span>
          <div className={s.marks}>
            <Image src="/assets/squads-logo-white.svg" alt="Squads" width={110} height={28} className={s.partnerLogo} />
            <Image src="/solana-logo.svg" alt="Solana" width={120} height={24} className={`${s.partnerLogo} ${s.solanaLogo}`} />
            <Image src="/nanobot_logo.webp" alt="NanoBot" width={120} height={28} className={s.partnerLogo} />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
