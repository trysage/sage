import s from './SquadsBlock.module.css'
import Reveal from './Reveal'
import SquadsDiagram from './SquadsDiagram'

export default function SquadsBlock() {
  return (
    <section className={s.section}>
      <div className={s.container}>
        <div className={s.block}>
          <Reveal>
            <span className={s.eyebrow}>Built on Squads Protocol</span>
            <h2 className={s.h2}>
              Two approvers.<br />
              One of them is <em>Sage.</em>
            </h2>
            <p className={s.body}>
              Built on Squads Protocol — Solana&apos;s most trusted multisig infrastructure
              securing over $10B in assets. Your wallet requires two signers to execute anything.
              You are one. Sage is the other. Nothing moves without both agreeing.
            </p>
            <div className={s.tags}>
              <span className={s.tag}>Squads Protocol</span>
              <span className={s.tag}>2-of-2</span>
              <span className={s.tag}>Solana Native</span>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <SquadsDiagram />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
