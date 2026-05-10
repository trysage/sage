import Image from 'next/image'
import s from './SquadsBlock.module.css'
import Reveal from './Reveal'

export default function SquadsBlock() {
  return (
    <section className={s.section}>
      <div className={s.container}>
        <div className={s.block}>
          <Reveal>
            <span className={s.eyebrow}>Built on Squads Protocol</span>
            <h2 className={s.h2}>
              Two signatures.<br />
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

          <Reveal className={s.diagram} delay={150}>
            <div className={s.diagramLabel}>Transaction · 0.84 SOL → JUP</div>

            <div className={`${s.sdRow} ${s.you}`}>
              <div className={s.avatar}>Y</div>
              <div>
                <div className={s.who}>You</div>
                <div className={s.role}>PRIMARY SIGNER</div>
              </div>
              <span className={s.sig}>◆ SIGNED</span>
            </div>

            <div className={s.sdAnd}>
              <span className={s.sdLine} />
              <span>AND</span>
              <span className={s.sdLine} />
            </div>

            <div className={`${s.sdRow} ${s.sage}`}>
              <div className={`${s.avatar} ${s.avatarSage}`}>
                <Image src="/assets/sage-mark-mint.png" alt="Sage" width={44} height={44} />
              </div>
              <div>
                <div className={s.who}>Sage</div>
                <div className={s.role}>CO-SIGNER · AI</div>
              </div>
              <span className={s.sig}>◆ SIGNED</span>
            </div>

            <div className={s.sdResult}>
              <div className={s.sdResultLabel}>RESULT</div>
              <div className={s.sdResultValue}>Both agree. Transaction executes.</div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
