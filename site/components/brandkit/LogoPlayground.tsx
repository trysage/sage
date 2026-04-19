'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import s from './LogoPlayground.module.css'

/* ── Types ── */
type Direction = 'horizontal' | 'stacked' | 'mark-only' | 'word-only' | 'badge'
type FontKey   = 'manrope' | 'fraunces' | 'cormorant' | 'cinzel' | 'grotesk' | 'mono' | 'tight'
type MarkColor = 'mint' | 'white' | 'ink'
type BgKey     = 'ink-800' | 'ink' | 'grad' | 'paper' | 'mint' | 'grid'

interface PlayState {
  direction: Direction
  font: FontKey
  wordSize: number
  wordWeight: number
  tracking: number
  markSize: number
  markColor: MarkColor
  wordColor: string
  termColor: string
  bg: BgKey
  showGrid: boolean
}

const DEFAULT: PlayState = {
  direction: 'horizontal',
  font: 'manrope',
  wordSize: 92,
  wordWeight: 700,
  tracking: -5,
  markSize: 140,
  markColor: 'mint',
  wordColor: '#ffffff',
  termColor: '#94FFC2',
  bg: 'ink-800',
  showGrid: false,
}

const PRESETS: Record<string, PlayState> = {
  primary:  { ...DEFAULT, font: 'manrope',   wordSize: 92, wordWeight: 700, tracking: -5,   markColor: 'mint',  bg: 'ink-800', wordColor: '#ffffff', termColor: '#94FFC2', direction: 'horizontal' },
  stacked:  { ...DEFAULT, font: 'manrope',   wordSize: 80, wordWeight: 700, tracking: -5,   markColor: 'mint',  bg: 'ink',     wordColor: '#ffffff', termColor: '#94FFC2', direction: 'stacked' },
  paper:    { ...DEFAULT, font: 'manrope',   wordSize: 92, wordWeight: 700, tracking: -5,   markColor: 'ink',   bg: 'paper',   wordColor: '#0B0E0D', termColor: '#1F6C42', direction: 'horizontal' },
  mint:     { ...DEFAULT, font: 'manrope',   wordSize: 92, wordWeight: 700, tracking: -5,   markColor: 'white', bg: 'mint',    wordColor: '#0B0E0D', termColor: '#0E2D1C', direction: 'horizontal' },
  serif:    { ...DEFAULT, font: 'fraunces',  wordSize: 96, wordWeight: 400, tracking: -4.5, markColor: 'mint',  bg: 'ink-800', wordColor: '#FBFBF7', termColor: '#94FFC2', direction: 'horizontal' },
  mono:     { ...DEFAULT, font: 'mono',      wordSize: 64, wordWeight: 600, tracking: -3,   markColor: 'mint',  bg: 'grid',    wordColor: '#94FFC2', termColor: '#5BD18E', direction: 'horizontal' },
}

const FONT_LABELS: Record<FontKey, string> = {
  manrope: 'Manrope · 700', fraunces: 'Fraunces · 400', cormorant: 'Cormorant · 500',
  cinzel: 'Cinzel · 500', grotesk: 'Space Grotesk · 500', mono: 'JB Mono · 600', tight: 'Inter Tight · 700',
}
const BG_LABELS: Record<BgKey, string> = {
  'ink-800': 'Card · ink-800', ink: 'Ink · primary', grad: 'Gradient · forest',
  paper: 'Paper · print', mint: 'Mint · reverse', grid: 'Grid · construction',
}
const MARK_SRCS: Record<MarkColor, string> = {
  mint:  '/assets/sage-mark-mint.png',
  white: '/assets/sage-mark-white.png',
  ink:   '/assets/sage-mark-dark.png',
}

const WORD_COLORS = ['#ffffff','#0B0E0D','#94FFC2','#5BD18E','#1F6C42','#FBFBF7']
const TERM_COLORS = ['#94FFC2','#5BD18E','#ffffff','#0B0E0D','#E5524F']

const FONT_TILES: { key: FontKey; label: string; preview: React.ReactNode }[] = [
  { key: 'manrope',   label: 'Manrope · chosen',  preview: <span style={{ fontFamily: 'var(--font-manrope)', fontWeight: 700 }}>Sage<em>.</em></span> },
  { key: 'fraunces',  label: 'Fraunces',           preview: <span style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 400 }}>Sage<em>.</em></span> },
  { key: 'cormorant', label: 'Cormorant',          preview: <span style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 500 }}>Sage<em>.</em></span> },
  { key: 'cinzel',    label: 'Cinzel',             preview: <span style={{ fontFamily: 'var(--font-cinzel)', fontWeight: 500, textTransform: 'uppercase', fontSize: 16, letterSpacing: '0.04em' }}>SAGE</span> },
  { key: 'grotesk',   label: 'Grotesk',            preview: <span style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 500 }}>Sage<em>.</em></span> },
  { key: 'mono',      label: 'Mono',               preview: <span style={{ fontFamily: 'var(--font-jetbrains)', fontWeight: 600, fontSize: 18 }}>sage<em>_</em></span> },
  { key: 'tight',     label: 'Inter Tight',        preview: <span style={{ fontFamily: 'var(--font-inter-tight)', fontWeight: 700 }}>Sage<em>.</em></span> },
]

const FONT_FAMILY_MAP: Record<FontKey, string> = {
  manrope: '"Manrope", sans-serif', fraunces: '"Fraunces", serif',
  cormorant: '"Cormorant Garamond", serif', cinzel: '"Cinzel", serif',
  grotesk: '"Space Grotesk", sans-serif', mono: '"JetBrains Mono", monospace',
  tight: '"Inter Tight", sans-serif',
}

/* ── helpers ── */
function Seg<T extends string>({ options, value, onChange }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={s.seg}>
      {options.map(o => (
        <button key={o.v} className={o.v === value ? s.segOn : undefined} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Group({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className={s.group}>
      <div className={s.groupLabel}>{label}{value && <span className={s.groupVal}>{value}</span>}</div>
      {children}
    </div>
  )
}

/* ── Export helpers ── */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

async function renderToCanvas(st: PlayState, scale = 1, includeBg = false): Promise<HTMLCanvasElement> {
  const markImg = await loadImage(MARK_SRCS[st.markColor])
  const fam = FONT_FAMILY_MAP[st.font]
  const isMono = st.font === 'mono'
  const wText = isMono ? 'sage' : 'Sage'
  const tText = isMono ? '_' : '.'
  const ls = ((-0.05) + st.tracking / 100) * st.wordSize
  const tmp = document.createElement('canvas').getContext('2d')!
  tmp.font = `${st.wordWeight} ${st.wordSize}px ${fam}`
  let wW = 0
  for (const ch of wText) wW += tmp.measureText(ch).width + ls
  const tW = tmp.measureText(tText).width
  const totalW = wW + tW
  const tH = st.wordSize
  const asc = st.wordSize * 0.78
  const mH = st.markSize
  const mW = markImg.width * (mH / markImg.height)
  const pad = Math.max(st.wordSize * 0.6, 80)
  const gap = 14

  let cw: number, ch: number, mx: number, my: number, tx: number, ty: number
  if (st.direction === 'stacked') {
    cw = pad * 2 + Math.max(mW, totalW); ch = pad * 2 + mH + 12 + tH
    mx = (cw - mW) / 2; my = pad; tx = (cw - totalW) / 2; ty = pad + mH + 12 + asc
  } else if (st.direction === 'mark-only') {
    cw = pad * 2 + mW; ch = pad * 2 + mH; mx = pad; my = pad; tx = ty = -9999
  } else if (st.direction === 'word-only') {
    cw = pad * 2 + totalW; ch = pad * 2 + tH; mx = my = -9999; tx = pad; ty = pad + asc
  } else {
    const ch0 = Math.max(mH, tH); cw = pad * 2 + mW + gap + totalW; ch = pad * 2 + ch0
    mx = pad; my = pad + (ch0 - mH) / 2; tx = pad + mW + gap; ty = pad + (ch0 - tH) / 2 + asc
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(cw * scale); canvas.height = Math.ceil(ch * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  if (includeBg) {
    if (st.bg === 'grad') {
      const g = ctx.createLinearGradient(0, 0, cw, ch)
      g.addColorStop(0, '#06090A'); g.addColorStop(0.6, '#0E1614'); g.addColorStop(1, '#0A1F14')
      ctx.fillStyle = g
    } else {
      ctx.fillStyle = { 'ink-800': '#13191A', ink: '#0B0E0D', paper: '#FBFBF7', mint: '#5BD18E', grid: '#0B0E0D' }[st.bg] ?? '#0B0E0D'
    }
    ctx.fillRect(0, 0, cw, ch)
  }

  if (mx >= 0) ctx.drawImage(markImg, mx, my, mW, mH)
  if (tx >= 0) {
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = st.wordColor; ctx.font = `${st.wordWeight} ${st.wordSize}px ${fam}`
    let cur = tx
    for (const c of wText) { ctx.fillText(c, cur, ty); cur += ctx.measureText(c).width + ls }
    ctx.fillStyle = st.termColor; ctx.fillText(tText, cur, ty)
  }
  return canvas
}

/* ── Main component ── */
export default function LogoPlayground() {
  const [st, setSt] = useState<PlayState>(DEFAULT)
  const [exporting, setExporting] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const set = useCallback(<K extends keyof PlayState>(k: K, v: PlayState[K]) => {
    setSt(prev => ({ ...prev, [k]: v }))
  }, [])

  const loadPreset = useCallback((name: string) => {
    const p = PRESETS[name]
    if (p) setSt(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleExport = useCallback(async (kind: string) => {
    setExporting(kind)
    try {
      if (kind === 'png-1x' || kind === 'png-2x' || kind === 'png-bg') {
        const scale = kind === 'png-2x' ? 2 : 1
        const canvas = await renderToCanvas(st, scale, kind === 'png-bg')
        await new Promise<void>(res => canvas.toBlob(b => {
          if (b) downloadBlob(b, `sage-logo-${st.font}-${st.direction}@${scale}x.png`)
          res()
        }, 'image/png'))
      } else if (kind === 'mark-png') {
        const img = await loadImage(MARK_SRCS[st.markColor])
        const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024
        const ctx = canvas.getContext('2d')!
        const m = 80, max = 944, r = Math.min(max / img.width, max / img.height)
        const w = img.width * r, h = img.height * r
        ctx.drawImage(img, (1024 - w) / 2, (1024 - h) / 2, w, h)
        await new Promise<void>(res => canvas.toBlob(b => { if (b) downloadBlob(b, `sage-mark-${st.markColor}-1024.png`); res() }, 'image/png'))
      } else if (kind === 'favicons') {
        const img = await loadImage(MARK_SRCS[st.markColor])
        for (const sz of [16, 32, 48, 96]) {
          const canvas = document.createElement('canvas'); canvas.width = sz; canvas.height = sz
          const ctx = canvas.getContext('2d')!
          const m = sz * 0.06, max = sz - m * 2, r = Math.min(max / img.width, max / img.height)
          const w = img.width * r, h = img.height * r
          ctx.drawImage(img, (sz - w) / 2, (sz - h) / 2, w, h)
          await new Promise<void>(res => canvas.toBlob(b => { if (b) downloadBlob(b, `sage-favicon-${sz}.png`); res() }, 'image/png'))
        }
      } else if (kind === 'svg') {
        const isMono = st.font === 'mono'
        const wText = isMono ? 'sage' : 'Sage'
        const tText = isMono ? '_' : '.'
        const fam = FONT_FAMILY_MAP[st.font].replace(/"/g, "'")
        const img = await loadImage(MARK_SRCS[st.markColor])
        const resp = await fetch(MARK_SRCS[st.markColor])
        const blob = await resp.blob()
        const data = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(blob) })
        const mH = st.markSize, mW = img.width * (mH / img.height)
        const approx = st.wordSize * 0.58
        const ls = (-0.05 + st.tracking / 100) * st.wordSize
        const totalW = wText.length * approx + ls * (wText.length - 1) + approx
        const pad = Math.max(st.wordSize * 0.6, 80), tH = st.wordSize
        const ch0 = Math.max(mH, tH), cw = pad * 2 + mW + 14 + totalW, ch = pad * 2 + ch0
        const mx = pad, my = pad + (ch0 - mH) / 2, tx = pad + mW + 14, ty = pad + (ch0 - tH) / 2 + st.wordSize * 0.78
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">
  <title>Sage logo</title>
  <image href="${data}" x="${mx}" y="${my}" width="${mW}" height="${mH}" />
  <text x="${tx}" y="${ty}" font-family="${fam}" font-size="${st.wordSize}" font-weight="${st.wordWeight}" letter-spacing="${ls.toFixed(2)}" fill="${st.wordColor}">
    ${wText}<tspan font-weight="${st.wordWeight}" fill="${st.termColor}">${tText}</tspan>
  </text>
</svg>`
        downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `sage-logo-${st.font}.svg`)
      }
      setDone(kind)
      setTimeout(() => setDone(null), 1400)
    } finally {
      setExporting(null)
    }
  }, [st])

  /* Derived values for display */
  const trackingLabel = `${st.tracking > 0 ? '+' : '−'}${Math.abs(st.tracking)}%`
  const stageSpec = `${FONT_LABELS[st.font]} · ${st.wordSize}px / ${trackingLabel}`

  /* Wordmark style */
  const wordStyle: React.CSSProperties = {
    fontFamily: FONT_FAMILY_MAP[st.font],
    fontSize: st.wordSize,
    fontWeight: st.wordWeight,
    letterSpacing: `${st.tracking / 100}em`,
    color: st.wordColor,
    ...(st.font === 'cinzel' ? { textTransform: 'uppercase', letterSpacing: '0.04em' } : {}),
    lineHeight: 1,
    whiteSpace: 'nowrap',
  }
  const termStyle: React.CSSProperties = { color: st.termColor }

  /* Stage bg class */
  const stageBgClass = {
    'ink-800': s.bgCard,
    ink: s.bgInk,
    grad: s.bgGrad,
    paper: s.bgPaper,
    mint: s.bgMint,
    grid: s.bgGrid,
  }[st.bg]

  const renderContent = (
    <div
      className={`${s.logoRender} ${s[`dir-${st.direction.replace('-', '_')}` as keyof typeof s] ?? ''}`}
      style={{ '--mark-size': `${st.markSize}px` } as React.CSSProperties}
      data-direction={st.direction}
    >
      {st.direction !== 'word-only' && (
        <span className={s.markWrap}>
          <Image src={MARK_SRCS[st.markColor]} alt="" width={st.markSize} height={st.markSize} style={{ height: st.markSize, width: 'auto' }} />
        </span>
      )}
      {st.direction !== 'mark-only' && (
        <span style={wordStyle}>
          {st.font === 'mono' ? 'sage' : 'Sage'}
          <span style={termStyle}>{st.font === 'mono' ? '_' : '.'}</span>
        </span>
      )}
    </div>
  )

  return (
    <div className={s.app}>

      {/* ─── SIDEBAR ─── */}
      <aside className={s.sidebar}>
        <div className={s.sidebarHead}>
          <Image src="/assets/sage-mark-mint.png" alt="Sage mark" width={28} height={28} />
          <div>
            <div className={s.sidebarTitle}>Logo<em>.</em>Lab</div>
            <div className={s.sidebarSub}>Playground · v0.1</div>
          </div>
        </div>

        <Group label="Lockup" value={st.direction.charAt(0).toUpperCase() + st.direction.slice(1)}>
          <Seg
            options={[{v:'horizontal',label:'Horiz'},{v:'stacked',label:'Stack'},{v:'mark-only',label:'Mark'},{v:'word-only',label:'Word'},{v:'badge',label:'Badge'}]}
            value={st.direction}
            onChange={v => set('direction', v as Direction)}
          />
        </Group>

        <Group label="Wordmark font">
          <div className={s.tiles}>
            {FONT_TILES.map(ft => (
              <button key={ft.key} className={`${s.tile} ${ft.key === st.font ? s.tileOn : ''}`} onClick={() => set('font', ft.key)}>
                <span className={s.tilePreview}>{ft.preview}</span>
                <span className={s.tileName}>{ft.label}</span>
              </button>
            ))}
          </div>
        </Group>

        <Group label="Word size" value={`${st.wordSize}px`}>
          <input type="range" min={32} max={180} step={2} value={st.wordSize} onChange={e => set('wordSize', +e.target.value)} />
        </Group>

        <Group label="Word weight" value={String(st.wordWeight)}>
          <input type="range" min={300} max={800} step={100} value={st.wordWeight} onChange={e => set('wordWeight', +e.target.value)} />
        </Group>

        <Group label="Tracking" value={trackingLabel}>
          <input type="range" min={-8} max={6} step={0.5} value={st.tracking} onChange={e => set('tracking', +e.target.value)} />
        </Group>

        <Group label="Mark size" value={`${st.markSize}px`}>
          <input type="range" min={40} max={280} step={4} value={st.markSize} onChange={e => set('markSize', +e.target.value)} />
        </Group>

        <Group label="Mark color">
          <Seg
            options={[{v:'mint',label:'Mint'},{v:'white',label:'White'},{v:'ink',label:'Ink'}]}
            value={st.markColor}
            onChange={v => set('markColor', v as MarkColor)}
          />
        </Group>

        <Group label="Word color">
          <div className={s.swatches}>
            {WORD_COLORS.map(c => (
              <button
                key={c}
                className={`${s.sw} ${c === st.wordColor ? s.swOn : ''}`}
                style={{ background: c, ...(c === '#0B0E0D' ? { border: '2px solid rgba(255,255,255,.15)' } : {}) }}
                onClick={() => set('wordColor', c)}
              />
            ))}
          </div>
        </Group>

        <Group label="Period color">
          <div className={s.swatches}>
            {TERM_COLORS.map(c => (
              <button
                key={c}
                className={`${s.sw} ${c === st.termColor ? s.swOn : ''}`}
                style={{ background: c, ...(c === '#0B0E0D' ? { border: '2px solid rgba(255,255,255,.15)' } : {}) }}
                onClick={() => set('termColor', c)}
              />
            ))}
          </div>
        </Group>

        <Group label="Background">
          <Seg
            options={[{v:'ink-800',label:'Card'},{v:'ink',label:'Ink'},{v:'grad',label:'Grad'},{v:'paper',label:'Paper'},{v:'mint',label:'Mint'},{v:'grid',label:'Grid'}]}
            value={st.bg}
            onChange={v => set('bg', v as BgKey)}
          />
        </Group>

        <Group label="Construction grid">
          <Seg
            options={[{v:'off' as unknown as BgKey,label:'Off'},{v:'on' as unknown as BgKey,label:'On'}]}
            value={(st.showGrid ? 'on' : 'off') as unknown as BgKey}
            onChange={v => set('showGrid', v === ('on' as unknown as BgKey))}
          />
        </Group>
      </aside>

      {/* ─── CANVAS ─── */}
      <main className={s.canvas}>
        <div className={s.canvasHead}>
          <h1>Logo <em>playground.</em></h1>
          <div className={s.canvasMeta}>
            <span><span className={s.canvasDot} />Live</span>
            <span>Adjust · drag · audition</span>
          </div>
        </div>

        {/* Stage */}
        <div className={`${s.stage} ${stageBgClass} ${st.showGrid ? s.showGrid : ''}`}>
          <div className={s.gridOverlay} />
          {renderContent}
          <div className={s.stageMeta}>
            <span>{stageSpec}</span>
            <span>{BG_LABELS[st.bg]}</span>
          </div>
        </div>

        {/* Export bar */}
        <div className={s.exportBar}>
          <div className={s.exportHead}>
            <span className={s.exportEyebrow}>Export</span>
            <span className={s.exportHint}>downloads your current stage exactly as you see it</span>
          </div>
          <div className={s.exportButtons}>
            {[
              { id: 'png-1x',   name: 'PNG',       sub: '@1× · transparent' },
              { id: 'png-2x',   name: 'PNG',       sub: '@2× · transparent' },
              { id: 'png-bg',   name: 'PNG',       sub: 'w/ background' },
              { id: 'svg',      name: 'SVG',       sub: 'vector · editable' },
              { id: 'mark-png', name: 'Mark only', sub: 'PNG · 1024px' },
              { id: 'favicons', name: 'Favicons',  sub: '16/32/48/96 zip' },
            ].map(btn => (
              <button
                key={btn.id}
                className={`${s.exBtn} ${exporting === btn.id ? s.exBusy : ''} ${done === btn.id ? s.exDone : ''}`}
                onClick={() => handleExport(btn.id)}
                disabled={exporting !== null}
              >
                <span className={s.exName}>{btn.name}</span>
                <span className={s.exSub}>{done === btn.id ? '✓ saved' : btn.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Concepts */}
        <div className={s.conceptsHead}>
          <h2>Six versions, side by side.</h2>
          <span className={s.conceptsIndex}>Click to load any into the stage</span>
        </div>

        <div className={s.concepts}>
          {[
            { key: 'primary', label: '01 · Primary horizontal', sub: 'Manrope', bg: s.conceptDark, children: <><Image src="/assets/sage-mark-mint.png" alt="" width={56} height={56} /><span className={s.cw}>Sage<em>.</em></span></> },
            { key: 'stacked', label: '02 · Stacked', sub: 'Manrope', bg: s.conceptDark, stack: true, children: <><Image src="/assets/sage-mark-mint.png" alt="" width={56} height={56} /><span className={s.cw}>Sage<em>.</em></span></> },
            { key: 'paper',   label: '03 · Paper · 1-color', sub: 'Manrope', bg: s.conceptPaper, children: <><Image src="/assets/sage-mark-dark.png" alt="" width={56} height={56} /><span className={`${s.cw} ${s.cwDark}`}>Sage<em>.</em></span></> },
            { key: 'mint',    label: '04 · Mint reverse', sub: 'White mark', bg: s.conceptMint, children: <><Image src="/assets/sage-mark-white.png" alt="" width={56} height={56} /><span className={`${s.cw} ${s.cwInk}`}>Sage<em>.</em></span></> },
            { key: 'serif',   label: '05 · Editorial serif', sub: 'Fraunces', bg: s.conceptDark, children: <><Image src="/assets/sage-mark-mint.png" alt="" width={56} height={56} /><span className={s.cw} style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 400 }}>Sage<em style={{ fontStyle: 'italic', fontWeight: 300 }}>.</em></span></> },
            { key: 'mono',    label: '06 · Terminal · crypto-native', sub: 'JB Mono', bg: s.conceptOutline, children: <><Image src="/assets/sage-mark-mint.png" alt="" width={56} height={56} /><span className={s.cw} style={{ fontFamily: 'var(--font-jetbrains)', fontWeight: 600, fontSize: 28, letterSpacing: '-0.03em' }}>sage<em>_</em></span></> },
          ].map(c => (
            <div key={c.key} className={`${s.concept} ${c.bg}`} onClick={() => loadPreset(c.key)}>
              <div className={`${s.conceptRender} ${c.stack ? s.conceptStack : ''}`}>{c.children}</div>
              <div className={s.conceptLabel}>
                <span>{c.label}</span><span>{c.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Favicon strip */}
        <div className={s.conceptsHead} style={{ marginTop: 48 }}>
          <h2>Mark at every scale.</h2>
          <span className={s.conceptsIndex}>16px → 96px favicons</span>
        </div>
        <div className={s.favicons}>
          {[16,24,32,48,64,96].map(sz => (
            <div key={sz} className={s.fav} style={{ width: sz, height: sz, borderRadius: sz >= 96 ? 14 : 8 }}>
              <Image src="/assets/sage-mark-mint.png" alt="" width={sz} height={sz} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            </div>
          ))}
          <span className={s.favMeta}>16 · 24 · 32 · 48 · 64 · 96</span>
        </div>

        <footer className={s.footer}>
          <span>Sage · logo lab · v0.1</span>
          <span>
            <Link href="/brandkit/logo-system">→ Logo system</Link>
            {' · '}
            <Link href="/brandkit/design-system">design system</Link>
            {' · '}
            <Link href="/brandkit">brand book</Link>
          </span>
        </footer>
      </main>
    </div>
  )
}
