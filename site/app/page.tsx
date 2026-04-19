import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import HowItWorks from '@/components/HowItWorks'
import SquadsBlock from '@/components/SquadsBlock'
import FAQ from '@/components/FAQ'
import ClosingCTA from '@/components/ClosingCTA'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <SquadsBlock />
        <FAQ />
        <ClosingCTA />
      </main>
      <Footer />
    </>
  )
}
