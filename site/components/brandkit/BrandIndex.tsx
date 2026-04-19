import Image from 'next/image'
import Link from 'next/link'
import s from './BrandIndex.module.css'

const CARDS = [
  {
    num: '01 — Foundations',
    href: '/brandkit/design-system',
    title: 'Design',
    titleEm: 'system.',
    desc: 'Color, type, spacing, components, voice. The rules every Sage surface follows.',
    tags: ['Color', 'Type', 'Components', 'Voice'],
    cta: 'Open system',
    preview: (
      <div className={s.pvDs}>
        <div style={{ background: '#5BD18E', gridColumn: 'span 4', aspectRatio: '2' }} />
        <div style={{ background: '#0A0D0E', border: '1px solid rgba(255,255,255,.1)', gridColumn: 'span 2', aspectRatio: '2' }} />
        <div style={{ background: '#FBFBF7', gridColumn: 'span 2', aspectRatio: '2' }} />
        {['#CFF5DF','#7CDFA5','#5BD18E','#3FBE76','#1F7A48','#0D3B23','#F0B33C','#E5524F'].map(c => (
          <div key={c} style={{ background: c }} />
        ))}
      </div>
    ),
  },
  {
    num: '02 — Identity',
    href: '/brandkit/logo-system',
    title: 'Logo',
    titleEm: 'system.',
    desc: 'The mark, the wordmark, six font candidates, five lockups, and the rules of clear space.',
    tags: ['Mark', 'Wordmark', 'Lockups', "Don'ts"],
    cta: 'Open logos',
    preview: (
      <div className={s.pvLogos}>
        <Image src="/assets/sage-mark-mint.png" alt="" width={60} height={60} />
        <span className={s.pvWord}>Sage<em>.</em></span>
      </div>
    ),
  },
  {
    num: '03 — Playground',
    href: '/brandkit/logo-playground',
    title: 'Logo',
    titleEm: 'lab.',
    desc: 'Audition every font, weight, color and lockup configuration. Export PNG, SVG and favicons.',
    tags: ['Fonts', 'Colors', 'Export', 'Favicons'],
    cta: 'Open playground',
    preview: (
      <div className={s.pvPlayground}>
        <Image src="/assets/sage-mark-mint.png" alt="" width={40} height={40} />
        <span className={s.pvWord}>Sage<em>.</em></span>
        <span className={s.pvDot} />
        <span className={s.pvCursor} />
      </div>
    ),
  },
]

export default function BrandIndex() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <div>
          <span className={s.eyebrow}>Brand Book · 04.2026</span>
          <h1 className={s.h1}>
            Sage<em>.</em>
          </h1>
          <p className={s.lede}>
            A personal AI co-signer for your Solana wallet. Quiet enough to disappear. Wise enough
            to recognize when something&apos;s wrong.
          </p>
        </div>
        <div className={s.markFrame}>
          <Image src="/assets/sage-mark-mint.png" alt="Sage mark" width={280} height={280} />
        </div>
      </header>

      <div className={s.grid}>
        {CARDS.map((card) => (
          <Link key={card.href} className={s.card} href={card.href}>
            <span className={s.num}>{card.num}</span>
            <div className={s.preview}>{card.preview}</div>
            <h3 className={s.cardTitle}>
              {card.title} <em>{card.titleEm}</em>
            </h3>
            <p className={s.cardDesc}>{card.desc}</p>
            <ul className={s.tags}>
              {card.tags.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <span className={s.arrow}>{card.cta}</span>
          </Link>
        ))}
      </div>

      <div className={s.meta}>
        <span>Sage · trysage.xyz</span>
        <span>Solana co-signer</span>
        <span>v0.1 working draft</span>
      </div>
    </div>
  )
}
