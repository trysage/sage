import type { Metadata } from 'next'
import {
  Fraunces,
  Cormorant_Garamond,
  Cinzel,
  Space_Grotesk,
  Inter_Tight,
} from 'next/font/google'
import BrandNav from '@/components/brandkit/BrandNav'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
})
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cinzel',
  display: 'swap',
})
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter-tight',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Sage — Brand Book', template: '%s · Sage Brand' },
  description: 'Sage identity system — color, type, logos, and voice.',
}

export default function BrandkitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={[
        fraunces.variable,
        cormorant.variable,
        cinzel.variable,
        spaceGrotesk.variable,
        interTight.variable,
      ].join(' ')}
    >
      <BrandNav />
      {children}
    </div>
  )
}
