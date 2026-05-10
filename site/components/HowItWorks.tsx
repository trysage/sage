import s from './HowItWorks.module.css'
import Reveal from './Reveal'
import LoopDiagram from './LoopDiagram'

const WAVE_BARS: { hot: boolean; h: string }[] = [
  { hot: false, h: '30%' }, { hot: true,  h: '50%' }, { hot: false, h: '22%' },
  { hot: true,  h: '70%' }, { hot: false, h: '40%' }, { hot: true,  h: '58%' },
  { hot: false, h: '28%' }, { hot: true,  h: '64%' }, { hot: false, h: '42%' },
  { hot: false, h: '36%' }, { hot: true,  h: '72%' }, { hot: false, h: '30%' },
  { hot: false, h: '50%' }, { hot: true,  h: '60%' },
]

export default function HowItWorks() {
  return (
    <section className={s.section} id="how">
      <div className={s.container}>
        <Reveal className={s.sectionHead}>
          <div>
            <span className={s.sectionIndex}>01 — The agent loop</span>
            <h2 className={s.h2}>
              An agent that{' '}
              <em>observes, reasons, acts.</em>
            </h2>
          </div>
          <p className={s.lede}>
            Sage runs a continuous loop on every transaction: read the call, recall your history,
            weigh the signals, decide. Most decisions take milliseconds and you never see them.
          </p>
        </Reveal>

        {/* Agent loop diagram */}
        <Reveal className={s.loopDiagram} delay={80}>
          <LoopDiagram />
        </Reveal>

        {/* Step cards */}
        <div className={s.steps}>
          <Reveal as="article" className={s.step}>
            <span className={s.stepNum}>
              <span>01 / Memory</span>
              <span>◆</span>
            </span>
            <h3 className={s.stepH3}>It learns you.</h3>
            <p className={s.stepP}>
              Sage builds an onchain memory of your normal behavior — amounts, timing, trusted
              addresses, the patterns that are uniquely yours. It updates with every signed
              transaction.
            </p>
            <div className={s.visual}>
              <div className={s.patternWave}>
                {WAVE_BARS.map((bar, i) => (
                  <span key={i} className={bar.hot ? s.hot : undefined} style={{ height: bar.h }} />
                ))}
              </div>
              <div className={s.waveLabel}>
                <span>30 DAYS</span>
                <span>YOUR RHYTHM</span>
              </div>
            </div>
          </Reveal>

          <Reveal as="article" className={s.step} delay={100}>
            <span className={s.stepNum}>
              <span>02 / Reasoning</span>
              <span>◆</span>
            </span>
            <h3 className={s.stepH3}>It weighs every call.</h3>
            <p className={s.stepP}>
              Each transaction is scored against your memory and against shared threat intelligence.
              Sage isn&apos;t matching rules — it&apos;s reasoning about whether{' '}
              <em>this</em> looks like <em>you</em>.
            </p>
            <div className={s.visual}>
              <div className={s.scanRows}>
                <div className={`${s.scanRow} ${s.r1}`}>
                  <span className={s.scanLabel}>Amount</span>
                  <div className={s.bar} />
                  <span className={s.scanPct} style={{ color: 'var(--mint-400)' }}>96%</span>
                </div>
                <div className={`${s.scanRow} ${s.r2}`}>
                  <span className={s.scanLabel}>Recipient</span>
                  <div className={s.bar} />
                  <span className={s.scanPct} style={{ color: 'var(--mint-400)' }}>84%</span>
                </div>
                <div className={`${s.scanRow} ${s.r3}`}>
                  <span className={s.scanLabel}>Timing</span>
                  <div className={`${s.bar} ${s.barWatch}`} />
                  <span className={s.scanPct} style={{ color: 'var(--watch)' }}>32%</span>
                </div>
              </div>
              <div className={s.scanMeta}>PATTERN MATCH · TX #4,028</div>
            </div>
          </Reveal>

          <Reveal as="article" className={s.step} delay={200}>
            <span className={s.stepNum}>
              <span>03 / Action</span>
              <span>◆</span>
            </span>
            <h3 className={s.stepH3}>It acts on your behalf.</h3>
            <p className={s.stepP}>
              Confident calls get signed in milliseconds. Borderline ones escalate to your Telegram
              with full reasoning. Clearly hostile ones never make it through. The agent only speaks
              when it has something worth saying.
            </p>
            <div className={s.visual}>
              <div className={s.speakMsg}>
                <strong>Sage</strong> — This wallet is 4 hours old and just received funds from 3
                known drainers. I&apos;m holding this until you check.
                <div className={s.speakActions}>
                  <span className={`${s.pill} ${s.safe}`}>APPROVE</span>
                  <span className={`${s.pill} ${s.danger}`}>REJECT</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
