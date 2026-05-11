import Image from 'next/image'
import s from './ClosingCTA.module.css'
import Reveal from './Reveal'

const PARTNERS = ['GoPlus', 'Solana', 'NanoBot']

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
          <span className={s.partnersLabel}>Trusted by · built with</span>
          <div className={s.marks}>
            <Image src="/assets/squads-logo-white.svg" alt="Squads" width={90} height={24} style={{ objectFit: 'contain', opacity: 0.7 }} />
            {PARTNERS.map((p) => (
              <span
                key={p}
                className={`${s.partnerMark} ${p === 'NanoBot' ? s.mono : ''}`}
              >
                {p}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
