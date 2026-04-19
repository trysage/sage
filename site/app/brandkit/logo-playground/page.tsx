import type { Metadata } from 'next'
import LogoPlayground from '@/components/brandkit/LogoPlayground'

export const metadata: Metadata = { title: 'Logo Playground' }

export default function LogoPlaygroundPage() {
  return <LogoPlayground />
}
