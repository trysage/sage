import s from './FAQ.module.css'
import Reveal from './Reveal'

const ITEMS = [
  {
    num: 'Q.01',
    q: 'Does Sage hold my funds or keys?',
    a: (
      <>
        <strong>Never.</strong> Sage is a co-signer, not a custodian. Your keys stay yours. Sage
        only holds the right to approve or reject — never to initiate.
      </>
    ),
  },
  {
    num: 'Q.02',
    q: 'What happens if Sage flags a transaction?',
    a: 'You get a Telegram alert with full context. You decide — approve or reject. Sage executes exactly what you say.',
  },
  {
    num: 'Q.03',
    q: 'What if I want a transaction to go through without Sage?',
    a: (
      <>
        You can disable Sage Mode at any time and use your wallet as a standard Squads multisig.{' '}
        <strong>Full control is always yours.</strong>
      </>
    ),
  },
  {
    num: 'Q.04',
    q: "How does Sage know what's safe for me?",
    a: 'Sage builds a behavioral profile from your transaction history — amounts, recipients, timing and token patterns. Over time it gets more precise to you specifically, not just general risk signals.',
  },
  {
    num: 'Q.05',
    q: 'Is this only for technical users?',
    a: (
      <>
        Not at all. Sign in with Google, connect Telegram and you are protected.{' '}
        <strong>No seed phrases. No configuration. No crypto knowledge required.</strong>
      </>
    ),
  },
]

export default function FAQ() {
  return (
    <section className={s.section} id="faq">
      <div className={s.container}>
        <Reveal className={s.sectionHead}>
          <div>
            <span className={s.sectionIndex}>02 — Frequently asked</span>
            <h2 className={s.h2}>
              Honest answers, <em>plainly said.</em>
            </h2>
          </div>
          <p className={s.lede}>
            No legal hedging. No &ldquo;may,&rdquo; no &ldquo;could,&rdquo; no asterisks. If we
            don&apos;t know something, we say so.
          </p>
        </Reveal>

        <div className={s.list}>
          {ITEMS.map((item, i) => (
            <Reveal key={item.num} className={s.item} delay={i * 60}>
              <span className={s.num}>{item.num}</span>
              <h3 className={s.q}>{item.q}</h3>
              <p className={s.a}>{item.a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
