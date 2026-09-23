import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './tooltip.css'

interface Props {
  // Optional so a tooltip can be just its note bubble (e.g. the Skills & Spells "?" badges).
  title?: string
  descriptionHtml?: string
  extra?: ReactNode
  note?: string
  children: ReactNode
}

const HIDDEN_STYLE: CSSProperties = { position: 'fixed', top: -9999, left: -9999, visibility: 'hidden' }

// Portals into document.body and positions itself from measured coordinates, so it always
// escapes whatever scrollable or clipped container the anchor happens to sit inside — a modal,
// a scrolling panel, or the page itself near its bottom edge — rather than being cut off by that
// ancestor's overflow. Flips above the anchor when there isn't room below, and clamps
// horizontally so it never runs off either edge of the viewport.
export function Tooltip({ title, descriptionHtml, extra, note, children }: Props) {
  const [phase, setPhase] = useState<'hidden' | 'measuring' | 'shown'>('hidden')
  const [style, setStyle] = useState<CSSProperties>({})
  const anchorRef = useRef<HTMLSpanElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = () => {
    timer.current = window.setTimeout(() => setPhase('measuring'), 700)
  }
  const hide = () => {
    window.clearTimeout(timer.current)
    setPhase('hidden')
  }

  // Renders once, off-screen but fully laid out, to measure its real size — only then do we know
  // whether it fits below the anchor or needs to flip above it.
  useLayoutEffect(() => {
    if (phase !== 'measuring' || !anchorRef.current || !bubbleRef.current) return
    const anchor = anchorRef.current.getBoundingClientRect()
    const bubble = bubbleRef.current.getBoundingClientRect()
    const margin = 8
    const fitsBelow = anchor.bottom + 10 + bubble.height <= window.innerHeight
    const top = fitsBelow ? anchor.bottom + 10 : Math.max(anchor.top - bubble.height - 10, margin)
    const left = Math.min(Math.max(anchor.left + anchor.width / 2 - bubble.width / 2, margin), window.innerWidth - bubble.width - margin)
    setStyle({ position: 'fixed', top, left })
    setPhase('shown')
  }, [phase])

  const bubble = (
    <div ref={bubbleRef} className="tooltip-group" style={phase === 'shown' ? style : HIDDEN_STYLE}>
      {(title || extra || descriptionHtml) && (
        <div className="tooltip-bubble" role="tooltip">
          {title && <div className="tooltip-title">{title}</div>}
          {extra}
          {descriptionHtml && <div className="tooltip-desc" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />}
        </div>
      )}
      {note && (
        <div className="tooltip-bubble tooltip-note-bubble" role="tooltip">
          <div className="tooltip-title">Note</div>
          <div className="tooltip-note-text">{note}</div>
        </div>
      )}
    </div>
  )

  return (
    <span ref={anchorRef} className="tooltip-anchor" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {phase !== 'hidden' && createPortal(bubble, document.body)}
    </span>
  )
}
