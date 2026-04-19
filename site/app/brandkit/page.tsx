import type { Metadata } from 'next'
import BrandIndex from '@/components/brandkit/BrandIndex'

export const metadata: Metadata = { title: 'Brand Book' }

export default function BrandBookPage() {
  return <BrandIndex />
}
