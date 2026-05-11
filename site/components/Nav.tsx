import Image from 'next/image'
import s from './Nav.module.css'

export default function Nav() {
  return (
    <header className={s.nav}>
      <div className={s.inner}>
        <a className={s.brand} href="#">
          <Image src="/assets/sage-mark-mint.png" alt="Sage" width={34} height={34} />
          <span className={s.word}>
            Sage<em>.</em>
          </span>
        </a>
        <nav className={s.links}>
          <a href="#how">How It Works</a>
          <a href="#manifesto">Manifesto</a>
          <a href="#faq">FAQ</a>
          <a className={s.btnPrimary} href="https://app.heysage.me">
            Launch App →
          </a>
        </nav>
      </div>
    </header>
  )
}
