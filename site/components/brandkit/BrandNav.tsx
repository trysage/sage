'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import s from './BrandNav.module.css'

const LINKS = [
  { href: '/brandkit',              label: 'Brand book' },
  { href: '/brandkit/design-system', label: 'Design system' },
  { href: '/brandkit/logo-system',   label: 'Logo system' },
  { href: '/brandkit/logo-playground', label: 'Playground' },
  { href: '/',                       label: 'Website' },
]

export default function BrandNav() {
  const pathname = usePathname()

  return (
    <nav className={s.nav}>
      <Link className={s.brand} href="/brandkit">
        <Image src="/assets/sage-mark-mint.png" alt="Sage" width={26} height={26} />
        <span>
          Sage<em>.</em>
        </span>
      </Link>
      <div className={s.links}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? s.active : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
