import Image from 'next/image'
import Link from 'next/link'
import s from './DesignSystem.module.css'

/* ── helpers ── */
function SectionHead({ index, title, em, desc }: { index: string; title: string; em?: string; desc: string }) {
  return (
    <div className={s.sectionHead}>
      <div>
        <span className={s.index}>{index}</span>
        <h2 className={s.h2}>{title}{em && <em>{em}</em>}</h2>
      </div>
      <p className={s.desc}>{desc}</p>
    </div>
  )
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className={s.card}>
      {title && <span className={s.cardTitle}>{title}</span>}
      {children}
    </div>
  )
}

const ICONS = [
  { id: 'shield',   d: 'M12 2 L20 6 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V6 Z' },
  { id: 'spark',    d: 'M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z' },
  { id: 'timing',   circle: true, d: 'M12 7 V12 L15 14' },
  { id: 'pattern',  d: 'M3 12 L9 12 L11 6 L13 18 L15 12 L21 12' },
  { id: 'wallet',   d: 'M3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2zM1 10h22M7 15h3' },
  { id: 'telegram', d: 'M21 4 L11 14 M21 4 L14 21 L11 14 L4 11 Z' },
]

export default function DesignSystem() {
  return (
    <div className={s.page}>

      {/* HERO */}
      <header className={s.hero}>
        <div>
          <span className={s.eyebrow}>Brand &amp; Design System · v0.1</span>
          <h1 className={s.heroH1}>Sage<em>.</em></h1>
          <p>A personal AI co-signer for Solana wallets. Wise enough to recognize you. Strict enough to stop what isn&apos;t.</p>
        </div>
        <div className={s.heroMeta}>
          {[
            ['Project', 'Sage / trysage.xyz'],
            ['Chain', 'Solana'],
            ['Surface', 'Wallet · Telegram · Web'],
            ['Document', '04 / 2026'],
          ].map(([k, v]) => (
            <div key={k} className={s.metaRow}>
              <span>{k}</span><span>{v}</span>
            </div>
          ))}
          <div className={s.metaRow}>
            <span>Status</span>
            <span style={{ color: 'var(--mint-300)' }}>◆ Working draft</span>
          </div>
        </div>
      </header>

      {/* 01 — PRINCIPLES */}
      <section className={s.section}>
        <SectionHead
          index="01 — Principles"
          title="The voice of a "
          em="quiet guardian."
          desc="Sage isn't a wall. It's the friend who reads the contract before you sign. Calm, decisive, never alarmist."
        />
        <div className={s.grid3}>
          {[
            ['01 / Principle', 'Wisdom over warning.', 'We explain the pattern, not just the threat. "This wallet is 4 hours old" beats "DANGER".'],
            ['02 / Principle', 'Default to passing.', '99% of your transactions are fine. The system should feel invisible until it earns your attention.'],
            ['03 / Principle', 'Receipts, not magic.', 'Every decision has a reason. Show the signal, the threshold, the precedent. Always.'],
          ].map(([ct, title, desc]) => (
            <Card key={ct} title={ct}>
              <h3 className={s.h1} style={{ margin: 0 }}>{title}</h3>
              <p className={s.bodySm}>{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 02 — COLOR */}
      <section className={s.section}>
        <SectionHead
          index="02 — Color"
          title="Mint, ink, and three signals."
          desc="Mint is the breath of safety — the most expensive pixel on the screen. Ink carries everything else. Three semantic colors govern transaction state."
        />

        {/* Hero swatches */}
        <div className={s.colorGrid} style={{ marginBottom: 32 }}>
          <div className={`${s.swatch} ${s.swatchLarge}`} style={{ background: 'var(--mint-400)', color: 'var(--ink-900)', gridColumn: 'span 2' }}>
            <div>
              <span className={s.cardTitle} style={{ color: 'rgba(0,0,0,.5)' }}>Primary</span>
              <div className={s.swatchName} style={{ marginTop: 8 }}>Sage Mint</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: .65, marginTop: 6 }}>The signal. The pulse. The &ldquo;you&apos;re safe&rdquo; tone.</div>
            </div>
            <div className={s.swatchMeta}><span>#5BD18E</span><span>oklch(80% .16 152)</span></div>
          </div>
          <div className={`${s.swatch} ${s.swatchLarge}`} style={{ background: 'var(--ink-900)', color: 'var(--ink-0)', border: '1px solid rgba(255,255,255,.1)' }}>
            <div>
              <span className={s.cardTitle} style={{ color: 'var(--ink-300)' }}>Surface</span>
              <div className={s.swatchName} style={{ marginTop: 8 }}>Deep Ink</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-300)', marginTop: 6 }}>Default canvas. Holds focus.</div>
            </div>
            <div className={s.swatchMeta}><span>#0A0D0E</span><span>oklch(13% .005 180)</span></div>
          </div>
          <div className={`${s.swatch} ${s.swatchLarge}`} style={{ background: 'var(--ink-0)', color: 'var(--ink-900)' }}>
            <div>
              <span className={s.cardTitle}>Paper</span>
              <div className={s.swatchName} style={{ marginTop: 8 }}>Parchment</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)', marginTop: 6 }}>Light surfaces, marketing.</div>
            </div>
            <div className={s.swatchMeta}><span>#FBFBF7</span><span>oklch(98% .005 100)</span></div>
          </div>
        </div>

        {/* Mint ramp */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span className={s.monoSm} style={{ color: 'var(--ink-200)' }}>MINT — brand ramp</span>
            <span className={s.monoSm} style={{ color: 'var(--ink-300)' }}>50 → 900</span>
          </div>
          <div className={s.ramp}>
            {[['#EAFBF2','var(--mint-900)','50'],['#CFF5DF','var(--mint-900)','100'],['#A8ECC4','var(--mint-900)','200'],['#7CDFA5','var(--mint-900)','300'],['#5BD18E','var(--mint-900)','400◆'],['#3FBE76','var(--ink-0)','500'],['#1F7A48','var(--ink-0)','700'],['#0D3B23','#7CDFA5','900']].map(([bg, c, label]) => (
              <div key={label} className={s.rampStep} style={{ background: bg, color: c }}>{label}</div>
            ))}
          </div>
        </div>

        {/* Ink ramp */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span className={s.monoSm} style={{ color: 'var(--ink-200)' }}>INK — neutral ramp</span>
            <span className={s.monoSm} style={{ color: 'var(--ink-300)' }}>0 → 950</span>
          </div>
          <div className={s.ramp}>
            {[['#FBFBF7','var(--ink-900)','0'],['#F2F2EB','var(--ink-900)','50'],['#E5E6DD','var(--ink-900)','100'],['#C8CBBE','var(--ink-900)','200'],['#8E938A','var(--ink-0)','300'],['#4A4F49','var(--ink-0)','500'],['#1F2421','var(--ink-50)','700'],['#0A0D0E','var(--ink-50)','900◆']].map(([bg, c, label]) => (
              <div key={label} className={s.rampStep} style={{ background: bg, color: c, border: bg === '#0A0D0E' ? '1px solid rgba(255,255,255,.06)' : undefined }}>{label}</div>
            ))}
          </div>
        </div>

        {/* Semantic */}
        <div className={s.grid3}>
          <div className={s.swatch} style={{ background: 'rgba(91,209,142,.10)', border: '1px solid rgba(91,209,142,.4)', color: 'var(--mint-300)' }}>
            <div>
              <span className={`${s.pill} ${s.safe}`}><span className={s.dot} />SAFE · PASS</span>
              <div className={s.swatchName} style={{ marginTop: 16, color: 'var(--mint-300)' }}>Pass</div>
              <p className={s.bodySm} style={{ color: 'var(--ink-200)', margin: '6px 0 0' }}>Matches your pattern. Signs instantly.</p>
            </div>
            <div className={s.swatchMeta}><span>#5BD18E</span><span>--safe</span></div>
          </div>
          <div className={s.swatch} style={{ background: 'rgba(240,179,60,.08)', border: '1px solid rgba(240,179,60,.4)', color: 'var(--watch)' }}>
            <div>
              <span className={`${s.pill} ${s.watch}`}><span className={s.dot} />REVIEW · TG</span>
              <div className={s.swatchName} style={{ marginTop: 16, color: 'var(--watch)' }}>Watch</div>
              <p className={s.bodySm} style={{ color: 'var(--ink-200)', margin: '6px 0 0' }}>Unusual but not hostile. Pings Telegram.</p>
            </div>
            <div className={s.swatchMeta}><span>#F0B33C</span><span>--watch</span></div>
          </div>
          <div className={s.swatch} style={{ background: 'rgba(229,82,79,.08)', border: '1px solid rgba(229,82,79,.4)', color: 'var(--danger)' }}>
            <div>
              <span className={`${s.pill} ${s.danger}`}><span className={s.dot} />BLOCK · HOLD</span>
              <div className={s.swatchName} style={{ marginTop: 16, color: 'var(--danger)' }}>Block</div>
              <p className={s.bodySm} style={{ color: 'var(--ink-200)', margin: '6px 0 0' }}>Known drainer or high-risk pattern.</p>
            </div>
            <div className={s.swatchMeta}><span>#E5524F</span><span>--danger</span></div>
          </div>
        </div>
      </section>

      {/* 03 — TYPOGRAPHY */}
      <section className={s.section}>
        <SectionHead
          index="03 — Typography"
          title="Manrope & "
          em="JetBrains."
          desc="A humanist sans speaks for the brand and the UI. A precise mono speaks for the chain. Two fonts. Tight system."
        />
        <div className={s.grid2} style={{ marginBottom: 56 }}>
          <Card title="Display · Brand">
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 140, lineHeight: .9, letterSpacing: '-0.05em', color: 'var(--ink-0)' }}>Aa</div>
            <div>
              <div className={s.h2style} style={{ marginBottom: 6 }}>Manrope</div>
              <p className={s.bodySm}>Humanist sans-serif. Open apertures, calm rhythm. Use 600–800 for display, 500 for headings, 400 for body and UI. One font, every screen.</p>
            </div>
            <div className={s.monoSm} style={{ color: 'var(--ink-300)' }}>300 · 400 · 500 · 600 · 700 · 800</div>
          </Card>
          <Card title="Mono · System">
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 132, lineHeight: .9, letterSpacing: '-0.03em', color: 'var(--mint-300)' }}>0x</div>
            <div>
              <div className={s.h2style} style={{ marginBottom: 6 }}>JetBrains Mono</div>
              <p className={s.bodySm}>For everything precise: addresses, hashes, amounts, status labels, eyebrows. Tracking +0.04em. Mint for emphasis.</p>
            </div>
            <div className={s.monoSm} style={{ color: 'var(--ink-300)' }}>400 · 500 · 600 · tabular-nums</div>
          </Card>
        </div>

        <div className={s.typeGrid}>
          {[
            { label: 'Display 1', render: <div className={s.display1}>Sign with <em>wisdom.</em></div>, specs: 'Manrope 700 · 96 / 92\n−4.5%' },
            { label: 'Display 2', render: <div className={s.display2}>Your wallet, watched by a friend who&apos;s read the contract.</div>, specs: 'Manrope 600 · 56 / 60\n−3%' },
            { label: 'H1', render: <div className={s.typeH1}>Reviewing transaction</div>, specs: 'Manrope 500 · 36 / 40\n−2%' },
            { label: 'H2', render: <div className={s.typeH2}>Pending approvals</div>, specs: 'Manrope 600 · 22 / 28\n−1%' },
            { label: 'Body', render: <div className={s.typeBody}>Sage co-signs every transaction using onchain memory and shared threat intelligence.</div>, specs: 'Manrope 400 · 16 / 25' },
            { label: 'Body SM', render: <div className={s.typeBodySm}>First-time recipient. 4× your median outbound amount.</div>, specs: 'Manrope 400 · 14 / 21' },
            { label: 'Mono · Detail', render: <div className={s.monoSm}>7xKX...gQ4n · 0.0042 SOL · +14ms · ◆ PASS</div>, specs: 'JetBrains 500 · 12 / 16' },
          ].map(({ label, render, specs }) => (
            <div key={label} className={s.typeRow}>
              <span className={s.typeLabel}>{label}</span>
              {render}
              <span className={s.typeSpecs} style={{ whiteSpace: 'pre-line' }}>{specs}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 04 — GEOMETRY */}
      <section className={s.section}>
        <SectionHead
          index="04 — Geometry"
          title="Soft corners, generous space."
          desc="Cards round to 14px. Pills go fully circular. Spacing follows a 4-base scale."
        />
        <div className={s.grid2} style={{ gap: 32 }}>
          <div>
            <div className={s.monoSm} style={{ color: 'var(--ink-200)', marginBottom: 16 }}>RADII</div>
            <div className={s.geoGrid}>
              {[['XS','4px'],['SM','8px'],['MD','14px'],['LG','22px'],['PILL','∞']].map(([l, v]) => (
                <div key={l} className={s.geoCard}>
                  <div className={s.geoShape} style={{ borderRadius: v === '∞' ? 999 : v }} />
                  <span className={s.typeLabel}>{l}</span>
                  <span className={s.geoVal}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className={s.monoSm} style={{ color: 'var(--ink-200)', marginBottom: 16 }}>SPACING · 4-BASE</div>
            {[['space-1','4',4],['space-2','8',8],['space-3','12',12],['space-4','16',16],['space-6','24',24],['space-8','32',32],['space-12','48',48],['space-16','64',64]].map(([k, v, w], i) => (
              <div key={k} className={s.spaceRow} style={i === 0 ? { borderTop: 'none' } : undefined}>
                <span className={s.spaceKey}>{k}</span>
                <span className={s.spaceVal}>{v}</span>
                <div className={s.spaceBar} style={{ width: w }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 05 — COMPONENTS */}
      <section className={s.section}>
        <SectionHead
          index="05 — Components"
          title="Built to "
          em="not"
          desc="Every UI primitive should fade until it has something to say. When it speaks, it speaks in mint."
        />

        <div className={s.grid2} style={{ marginBottom: 24 }}>
          <Card title="Buttons">
            <div className={s.btnRow}>
              <button className={`${s.btn} ${s.btnPrimary}`}>Approve transaction</button>
              <button className={`${s.btn} ${s.btnSecondary}`}>Open in Telegram</button>
              <button className={`${s.btn} ${s.btnGhost}`}>Skip</button>
            </div>
            <div className={s.btnRow}>
              <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}>Sign · 0.42 SOL</button>
              <button className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}>Details</button>
              <button className={`${s.btn} ${s.btnDanger} ${s.btnSm}`}>Block forever</button>
            </div>
          </Card>
          <Card title="Status pills">
            <div className={s.btnRow}>
              <span className={`${s.pill} ${s.safe}`}><span className={s.dot} />SIGNED · 14ms</span>
              <span className={`${s.pill} ${s.watch}`}><span className={s.dot} />HELD · awaiting TG</span>
              <span className={`${s.pill} ${s.danger}`}><span className={s.dot} />BLOCKED · drainer</span>
            </div>
            <div className={s.btnRow}>
              <span className={`${s.pill} ${s.safe}`}><span className={s.dot} />PATTERN MATCH 96%</span>
              <span className={`${s.pill} ${s.watch}`}><span className={s.dot} />NEW RECIPIENT</span>
              <span className={`${s.pill} ${s.danger}`}><span className={s.dot} />HIGH RISK</span>
            </div>
          </Card>
        </div>

        <div className={s.txList} style={{ marginBottom: 24 }}>
          <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className={s.cardTitle}>Activity · last 30 min</span>
            <span className={s.monoSm} style={{ color: 'var(--ink-300)' }}>localhost:sage / wallet</span>
          </div>
          {[
            { name: 'Jupiter Aggregator', addr: 'JUP4...vMSx', reason: 'Routine swap. Within your weekly band.', status: 'safe' as const, label: 'PASS', amount: '−0.84 SOL', sub: '$148.20 · signed 14ms' },
            { name: 'Unknown wallet', addr: '7xKX...gQ4n', reason: 'First-time recipient. 4× your median outbound.', status: 'watch' as const, label: 'REVIEW', amount: '−4.20 SOL', sub: '$740.00 · held 2m' },
            { name: 'Suspect contract', addr: 'DRA1...nrZk', reason: 'Matches drainer fingerprint shared 6h ago.', status: 'danger' as const, label: 'BLOCK', amount: '−ALL SOL', sub: 'prevented' },
          ].map((tx) => (
            <div key={tx.addr} className={s.txRow}>
              <div className={s.txWho}>
                <span className={s.txName}>{tx.name}</span>
                <span className={s.txAddr}>{tx.addr}</span>
              </div>
              <div className={s.txReason}>{tx.reason}</div>
              <span className={`${s.pill} ${s[tx.status]}`} style={{ justifySelf: 'end' }}><span className={s.dot} />{tx.label}</span>
              <span className={s.txAmount}>{tx.amount}<span className={s.txSub}>{tx.sub}</span></span>
            </div>
          ))}
        </div>

        <div>
          <div className={s.monoSm} style={{ color: 'var(--ink-200)', marginBottom: 16 }}>ICONOGRAPHY · 1.5px stroke, mint-300</div>
          <div className={s.iconGrid}>
            {ICONS.map((icon) => (
              <div key={icon.id} className={s.iconCard}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mint-300)" strokeWidth="1.5">
                  {icon.circle && <circle cx="12" cy="12" r="9" />}
                  <path d={icon.d} />
                </svg>
                <span className={s.iconLabel}>{icon.id}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06 — VOICE */}
      <section className={s.section}>
        <SectionHead
          index="06 — Copy & Voice"
          title="How Sage "
          em="speaks."
          desc='Specific. Calm. Always with a reason. Never yells, never patronizes, never says "FRAUD" in red.'
        />
        <div className={s.voiceGrid}>
          <div className={`${s.voiceCard} ${s.voiceDo}`}>
            <span className={s.voiceHead}>◆ Yes</span>
            <p className={s.voiceQuote}>&ldquo;This wallet is 4 hours old and just received funds from 3 known drainers. I&apos;m holding this until you check Telegram.&rdquo;</p>
            <p className={s.voiceNote}>Specific signal · concrete action · calm tone</p>
          </div>
          <div className={`${s.voiceCard} ${s.voiceDont}`}>
            <span className={s.voiceHead}>✕ No</span>
            <p className={s.voiceQuote}>&ldquo;⚠️ HIGH RISK TRANSACTION DETECTED! Do you want to proceed anyway?&rdquo;</p>
            <p className={s.voiceNote}>Vague, alarmist, asks the user to make the decision the agent should already have made.</p>
          </div>
          <div className={`${s.voiceCard} ${s.voiceDo}`}>
            <span className={s.voiceHead}>◆ Yes</span>
            <p className={s.voiceQuote}>&ldquo;Looks like your usual Tuesday Jupiter routine. Signed in 14ms — nothing for you to do.&rdquo;</p>
            <p className={s.voiceNote}>Acknowledges pattern · invisible by default · earns trust silently.</p>
          </div>
          <div className={`${s.voiceCard} ${s.voiceDont}`}>
            <span className={s.voiceHead}>✕ No</span>
            <p className={s.voiceQuote}>&ldquo;Transaction successful. ✅&rdquo;</p>
            <p className={s.voiceNote}>Empty. Tells you what happened, not why it was safe.</p>
          </div>
        </div>
      </section>

      <footer className={s.footer}>
        <span>Sage · personal AI co-signer · Solana</span>
        <span>Design system v0.1 · 04.2026</span>
        <span>
          <Link href="/brandkit">← Brand book</Link>
          {' · '}
          <Link href="/brandkit/logo-system">Logo system →</Link>
        </span>
      </footer>

    </div>
  )
}
