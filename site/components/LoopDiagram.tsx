'use client'
import { useEffect, useState } from 'react'
import s from './HowItWorks.module.css'

const NODES = [
  { k: '01', v: 'Observe' },
  { k: '02', v: 'Recall'  },
  { k: '03', v: 'Reason'  },
  { k: '04', v: 'Act'     },
]

export default function LoopDiagram() {
  const [active, setActive] = useState(3)

  useEffect(() => {
    const id = setInterval(() => setActive(prev => (prev + 1) % NODES.length), 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {NODES.map((node, i) => (
        <span key={node.k}>
          <span className={`${s.loopNode} ${active === i ? s.loopNodeActive : ''}`}>
            <span className={s.loopKey}>{node.k}</span>
            <span className={s.loopVal}>{node.v}</span>
          </span>
          {i < NODES.length - 1 && (
            <span className={`${s.loopArrow} ${active === i ? s.loopArrowLit : ''}`}>→</span>
          )}
        </span>
      ))}
      <span className={`${s.loopArrow} ${s.loopBack} ${active === NODES.length - 1 ? s.loopArrowLit : ''}`}>↺</span>
    </>
  )
}
