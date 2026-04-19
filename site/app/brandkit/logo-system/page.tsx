import type { Metadata } from 'next'
import LogoSystem from '@/components/brandkit/LogoSystem'

export const metadata: Metadata = { title: 'Logo System' }

export default function LogoSystemPage() {
  return <LogoSystem />
}
