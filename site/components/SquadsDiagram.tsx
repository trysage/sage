'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import s from './SquadsDiagram.module.css'

const PHASES = ['idle', 'propose', 'sign', 'exec', 'done'] as const
type Phase = (typeof PHASES)[number]

const pi = (p: Phase) => PHASES.indexOf(p)
const gte = (curr: Phase, target: Phase) => pi(curr) >= pi(target)

const DURATIONS: Record<Phase, number> = {
  idle:    1000,
  propose: 1400,
  sign:    1400,
  exec:    2400,
  done:    1800,
}

export default function SquadsDiagram() {
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    const t = setTimeout(() => {
      const next = pi(phase) + 1
      if (next < PHASES.length) {
        setPhase(PHASES[next])
      } else {
        setPhase('idle')
      }
    }, DURATIONS[phase])
    return () => clearTimeout(t)
  }, [phase])

  const proposed = gte(phase, 'propose')
  const signed   = gte(phase, 'sign')
  const executed = gte(phase, 'exec')

  return (
    <div className={`${s.diagram} ${phase === 'done' ? s.fading : ''}`}>
      <div className={s.diagramLabel}>Transaction · 0.84 SOL → JUP</div>

      <div className={`${s.sdRow} ${s.you}`}>
        <div className={`${s.avatar} ${s.avatarUser}`} aria-hidden={true}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
          </svg>
        </div>
        <div>
          <div className={s.who}>You</div>
          <div className={s.role}>PRIMARY SIGNER</div>
        </div>
        <span className={`${s.sig} ${proposed ? s.sigIn : ''}`}>◆ PROPOSED</span>
      </div>

      <div className={s.sdAnd}>
        <span className={s.sdLine} />
        <span>AND</span>
        <span className={s.sdLine} />
      </div>

      <div className={`${s.sdRow} ${s.sage}`}>
        <div className={`${s.avatar} ${s.avatarSage}`}>
          <Image src="/assets/sage-mark-mint.png" alt="Sage" width={44} height={44} />
        </div>
        <div>
          <div className={s.who}>Sage</div>
          <div className={s.role}>CO-SIGNER · AI</div>
        </div>
        <span className={`${s.sig} ${signed ? s.sigIn : ''} ${executed ? s.sigExecuted : ''}`}>
          {executed ? '◆ EXECUTED' : '◆ APPROVED'}
        </span>
      </div>

      <div className={`${s.sdResult} ${executed ? s.resultIn : ''}`}>
        <div className={s.sdResultLabel}>RESULT</div>
        <div className={s.sdResultValue}>Both agree. Transaction executes.</div>
      </div>
    </div>
  )
}
