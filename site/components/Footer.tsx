import Image from 'next/image'
import s from './Footer.module.css'

const NAV_LINKS = [
  { href: '#how',       label: 'How It Works' },
  { href: '#manifesto', label: 'Manifesto' },
  { href: '#faq',       label: 'FAQ' },
  { href: 'https://x.com/heysageme', target: '_blank', label: 'Twitter' },
  { href: 'https://github.com/heysageme/sage', target: '_blank', label: 'GitHub' },
]

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.row}>
        <div className={s.brand}>
          <Image src="/assets/sage-mark-mint.png" alt="Sage" width={28} height={28} />
          <span className={s.word}>
            Sage<em>.</em>
          </span>
        </div>
        <nav className={s.nav}>
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} target={link.target}>
              {link.label}
            </a>
          ))}
        </nav>
        <span className={s.meta}>© 2026 · Sage</span>
      </div>
    </footer>
  )
}
