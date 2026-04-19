import Image from 'next/image'
import Link from 'next/link'
import s from './LogoSystem.module.css'

function SectionHead({ index, title, em, desc }: { index: string; title: string; em?: string; desc?: string }) {
  return (
    <div className={s.sectionHead}>
      <div>
        <span className={s.index}>{index}</span>
        <h2 className={s.h2}>{title}{em && <em>{em}</em>}</h2>
      </div>
      {desc && <p className={s.desc}>{desc}</p>}
    </div>
  )
}

const FONT_CARDS = [
  { id: 'fraunces',  label: 'Option A · Fraunces',       fontStyle: { fontFamily: 'var(--font-fraunces)', fontWeight: 400, fontSize: 64 } as React.CSSProperties,      note: 'Optical size serif — literary, aged',          chosen: false, wordmark: <>Sage<em>.</em></> },
  { id: 'cormorant', label: 'Option B · Cormorant Garamond', fontStyle: { fontFamily: 'var(--font-cormorant)', fontWeight: 500, fontSize: 72, letterSpacing: '-0.02em' } as React.CSSProperties, note: 'Elegant display serif — formal, editorial', chosen: false, wordmark: <>Sage<em>.</em></> },
  { id: 'cinzel',    label: 'Option C · Cinzel',          fontStyle: { fontFamily: 'var(--font-cinzel)', fontWeight: 400, fontSize: 48, letterSpacing: '0.08em', textTransform: 'uppercase' as const }, note: 'Roman-inspired caps — classical, monumental', chosen: false, wordmark: <>SAGE<em>.</em></> },
  { id: 'grotesk',   label: 'Option D · Space Grotesk',   fontStyle: { fontFamily: 'var(--font-space-grotesk)', fontWeight: 600, fontSize: 64 } as React.CSSProperties,  note: 'Geometric grotesque — technical, modern',      chosen: false, wordmark: <>Sage<em>.</em></> },
  { id: 'manrope',   label: 'Option E · Manrope',         fontStyle: { fontFamily: 'var(--font-manrope)', fontWeight: 700, fontSize: 64 } as React.CSSProperties,        note: 'Humanist sans — open, calm, precise',          chosen: true,  wordmark: <>Sage<em>.</em></> },
  { id: 'jetbrains', label: 'Option F · JetBrains Mono',  fontStyle: { fontFamily: 'var(--font-jetbrains)', fontWeight: 500, fontSize: 52, letterSpacing: '-0.02em' } as React.CSSProperties, note: 'Monospaced — developer-forward, technical',    chosen: false, wordmark: <>Sage<em>.</em></> },
]

const LOCKUPS = [
  { name: 'Horizontal · Dark', usage: 'Primary — nav, headers, hero', col: 'span 1', type: 'dark' as const },
  { name: 'Horizontal · Light', usage: 'Print, light surfaces', col: 'span 1', type: 'light' as const },
]
const LOCKUPS_SMALL = [
  { name: 'Stacked · Dark', usage: 'Square contexts, app icons', type: 'stacked' as const },
  { name: 'Mark only', usage: 'Favicon, 32px and below', type: 'mark-only' as const },
  { name: 'Horizontal · Mint', usage: 'CTAs, accent blocks only', type: 'mint' as const },
]

const DONTS = [
  { title: 'Distort or skew', desc: 'No stretching, squashing, or perspective transforms. The mark has fixed proportions.', imgStyle: { transform: 'skewX(-15deg) scaleY(.8)', opacity: .7 } as React.CSSProperties },
  { title: 'Recolor the mark', desc: 'Only Mint, Ink, or White. No gradients, brand-adjacent colors, or tints applied to the mark itself.', imgStyle: { filter: 'hue-rotate(200deg) saturate(1.5)' } as React.CSSProperties },
  { title: 'Add effects', desc: 'No drop shadows, glows, outlines, blurs, or texture overlays on the mark or wordmark.', imgStyle: { filter: 'drop-shadow(0 0 12px #5BD18E) drop-shadow(0 0 24px #5BD18E)', opacity: .8 } as React.CSSProperties },
  { title: 'Low-contrast background', desc: 'Never place a Mint mark on a green or dark-green surface. Contrast must exceed 4.5:1.', imgStyle: { opacity: .28 } as React.CSSProperties, bgStyle: { background: 'linear-gradient(135deg, #1A2E22, #2A4035)' } as React.CSSProperties },
]

const SIZE_STEPS = [
  { px: 96, label: '96px · Web hero', tooSmall: false },
  { px: 56, label: '56px · Nav', tooSmall: false },
  { px: 32, label: '32px · Inline', tooSmall: false },
  { px: 20, label: '20px · Min digital', tooSmall: false },
  { px: 12, label: '12px · Too small', tooSmall: true },
]

export default function LogoSystem() {
  return (
    <div className={s.page}>

      <header className={s.hero}>
        <span className={s.eyebrow}>Identity · Logo System · v0.1</span>
        <h1 className={s.heroH1}>The mark of <em>Sage.</em></h1>
        <p className={s.heroPara}>A quiet symbol for a quiet guardian. One mark, six uses, zero compromises. Here is where every pixel is decided.</p>
      </header>

      {/* 01 — THE MARK */}
      <section className={s.section}>
        <SectionHead index="01 — The Mark" title="Three " em="contexts." desc="The mark in all approved background contexts. Never use other combinations." />
        <div className={s.grid3}>
          <div className={s.markCard}>
            <div className={s.markStageDeep}><Image src="/assets/sage-mark-mint.png" alt="Sage mark on deep" width={120} height={120} /></div>
            <div className={s.markMeta}><span className={s.markLabel}>Deep · primary</span><span className={s.markSpec}>Mint on #06090A</span></div>
          </div>
          <div className={s.markCard}>
            <div className={s.markStagePaper}>
              <Image src="/assets/sage-mark-dark.png" alt="Sage mark on paper" width={120} height={120} style={{ objectFit: 'contain' }} />
            </div>
            <div className={s.markMeta}><span className={s.markLabel}>Paper · print</span><span className={s.markSpec}>Ink on #FBFBF7</span></div>
          </div>
          <div className={s.markCard}>
            <div className={s.markStageMint}>
              <Image src="/assets/sage-mark-white.png" alt="Sage mark on mint" width={120} height={120} style={{ objectFit: 'contain' }} />
            </div>
            <div className={s.markMeta}><span className={s.markLabel}>Mint · accent</span><span className={s.markSpec}>White on #5BD18E</span></div>
          </div>
        </div>
      </section>

      {/* 02 — WORDMARK */}
      <section className={s.section}>
        <SectionHead index="02 — Wordmark" title="Six " em="contenders." desc="Each font carries a different personality. One was chosen. The others are archived." />
        <div className={s.grid2}>
          {FONT_CARDS.map((fc) => (
            <div key={fc.id} className={`${s.fontCard} ${fc.chosen ? s.fontCardChosen : ''}`}>
              {fc.chosen && <span className={s.chosenBadge}>★ chosen</span>}
              <div>
                <div className={s.fontCardLabel}>{fc.label}</div>
                <div className={s.wordmarkDisplay} style={fc.fontStyle}>{fc.wordmark}</div>
              </div>
              <div className={s.fontMeta}>
                <span className={s.fontName}>{fc.id === 'jetbrains' ? 'JetBrains Mono · 500' : fc.id === 'manrope' ? 'Manrope · 700' : fc.label.split(' · ')[1] + ' · ' + (fc.fontStyle as { fontWeight: number }).fontWeight}</span>
                <span className={s.fontNote}>{fc.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 03 — WHY MANROPE */}
      <section className={s.section}>
        <SectionHead index="03 — Rationale" title="Why " em="Manrope." />
        <div className={s.recommendation}>
          <div>
            <h3 className={s.recH3}>Humanist. Calm. <em>Trustworthy.</em></h3>
            <p className={s.recBody}>Manrope is the only candidate that reads as a person rather than a product. Its open apertures and gentle geometry match Sage&apos;s personality — an advisor who&apos;s read the contract, not an alarm system that shouts warnings. It renders cleanly at every size from a 16px status label to a 128px hero lockup, and its 300–800 weight range covers every Sage surface with one typeface.</p>
            <ul className={s.recTags}>
              {['Open apertures','300–800 weight axis','Humanist x-height','Clean at 12px','Geometric calm','Variable font'].map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div className={s.pick}>
            <Image src="/assets/sage-mark-mint.png" alt="Sage mark" width={72} height={72} />
            <div className={s.pickWord}>Sage<em>.</em></div>
            <span className={s.pickMeta}>Manrope 700 · −4%</span>
          </div>
        </div>
      </section>

      {/* 04 — LOCKUPS */}
      <section className={s.section}>
        <SectionHead index="04 — Lockups" title="Five " em="official forms." desc="Use only these configurations. Never improvise a new arrangement." />
        <div className={s.grid2} style={{ marginBottom: 20 }}>
          {LOCKUPS.map((l) => (
            <div key={l.name} className={s.lockupCard}>
              <div className={l.type === 'light' ? s.lockupStageLight : s.lockupStageDark}>
                <Image src="/assets/sage-mark-mint.png" alt="" width={56} height={56} />
                <span className={l.type === 'light' ? s.lockupWmLight : s.lockupWm} style={{ fontSize: 48 }}>Sage<em>.</em></span>
              </div>
              <div className={s.lockupMeta}><span className={s.lockupName}>{l.name}</span><span className={s.lockupUsage}>{l.usage}</span></div>
            </div>
          ))}
        </div>
        <div className={s.grid3}>
          {LOCKUPS_SMALL.map((l) => (
            <div key={l.name} className={s.lockupCard}>
              <div className={l.type === 'mint' ? s.lockupStageMint : l.type === 'mark-only' ? s.lockupStageMarkOnly : s.lockupStageDark} style={l.type === 'stacked' ? { flexDirection: 'column', gap: 12 } : undefined}>
                {l.type !== 'mark-only' && l.type !== 'mint' && <Image src="/assets/sage-mark-mint.png" alt="" width={l.type === 'stacked' ? 72 : 52} height={l.type === 'stacked' ? 72 : 52} />}
                {l.type === 'mark-only' && <Image src="/assets/sage-mark-mint.png" alt="" width={80} height={80} />}
                {l.type === 'mint' && <>
                  <Image src="/assets/sage-mark-white.png" alt="" width={52} height={52} />
                  <span className={s.lockupWmMint} style={{ fontSize: 40 }}>Sage<em>.</em></span>
                </>}
                {l.type !== 'mark-only' && l.type !== 'mint' && <span className={s.lockupWm} style={{ fontSize: 40 }}>Sage<em>.</em></span>}
              </div>
              <div className={s.lockupMeta}><span className={s.lockupName}>{l.name}</span><span className={s.lockupUsage}>{l.usage}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* 05 — CONSTRUCTION */}
      <section className={s.section}>
        <SectionHead index="05 — Construction" title="Clear space & " em="minimums." desc="The mark needs breathing room. Never crowd it." />
        <div className={s.constructionWrap}>
          <div className={s.constructionStage}>
            <div className={s.constructionInner}>
              <span className={s.constructionLabelTop}>x = cap height</span>
              <span className={s.constructionLabelBottom}>min clear space = 1x</span>
              <div className={s.constructionHLine} />
              <div className={s.constructionBracket} />
              <Image src="/assets/sage-mark-mint.png" alt="Sage mark" width={96} height={96} />
              <div className={s.constructionWm}>Sage<em>.</em></div>
            </div>
          </div>
          <div className={s.constructionFooter}>
            <span>Clear space: <strong>1× cap height on all sides</strong></span>
            <span>Alignment: <strong>optical baseline</strong></span>
            <span>Mark–word gap: <strong>0.3× mark height</strong></span>
          </div>
        </div>
        <div className={s.sizeStrip}>
          {SIZE_STEPS.map((step) => (
            <div key={step.px} className={`${s.sizeCard} ${step.tooSmall ? s.sizeCardSmall : ''}`}>
              <Image src="/assets/sage-mark-mint.png" alt="" width={step.px} height={step.px} />
              <span className={s.sizeLabel}>{step.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 06 — DON'TS */}
      <section className={s.section}>
        <SectionHead index="06 — Don'ts" title="What " em="breaks" desc="Four things that are never acceptable, regardless of context." />
        <div className={s.dontsGrid}>
          {DONTS.map((d) => (
            <div key={d.title} className={s.dontCard}>
              <div className={s.dontStage} style={d.bgStyle}>
                <span className={s.dontBadge}>✕ Never</span>
                <Image src="/assets/sage-mark-mint.png" alt="" width={72} height={72} style={d.imgStyle} />
              </div>
              <div className={s.dontFooter}>
                <div className={s.dontTitle}>{d.title}</div>
                <p className={s.dontDesc}>{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className={s.footer}>
        <span>Sage · personal AI co-signer · Solana</span>
        <span>Logo system v0.1 · 04.2026</span>
        <span>
          <Link href="/brandkit/design-system">← Design system</Link>
          {' · '}
          <Link href="/brandkit/logo-playground">Playground →</Link>
        </span>
      </footer>

    </div>
  )
}
