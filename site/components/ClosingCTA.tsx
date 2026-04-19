import Image from 'next/image'
import s from './ClosingCTA.module.css'

const PARTNERS = ['Squads', 'GoPlus', 'Solana', 'NanoBot']

export default function ClosingCTA() {
  return (
    <section className={s.section} id="manifesto">
      <div className={s.container}>
        <div className={s.mark}>
          <Image src="/assets/sage-mark-mint.png" alt="Sage" width={80} height={80} />
        </div>

        <h2 className={s.h2}>
          Wise enough to recognize you.<br />
          <em>Strict enough</em> to stop what isn&apos;t.
        </h2>

        <div className={s.ctaRow}>
          <a className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} href="#">
            Try Sage →
          </a>
          <a className={`${s.btn} ${s.btnGhost} ${s.btnLg}`} href="#">
            Read the Manifesto →
          </a>
        </div>

        <div className={s.partners}>
          <span className={s.partnersLabel}>Trusted by · built with</span>
          <div className={s.marks}>
            {PARTNERS.map((p) => (
              <span
                key={p}
                className={`${s.partnerMark} ${p === 'NanoBot' ? s.mono : ''}`}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
