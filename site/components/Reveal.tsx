'use client'
import { useEffect, useRef, useState } from 'react'
import s from './Reveal.module.css'

type Props = {
  as?: keyof React.JSX.IntrinsicElements
  delay?: number
  className?: string
  children: React.ReactNode
}

export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const AnyTag = Tag as React.ElementType
  return (
    <AnyTag
      ref={ref}
      className={`${s.base} ${visible ? s.visible : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </AnyTag>
  )
}
