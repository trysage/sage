import type { Metadata } from 'next'
import DesignSystem from '@/components/brandkit/DesignSystem'

export const metadata: Metadata = { title: 'Design System' }

export default function DesignSystemPage() {
  return <DesignSystem />
}
