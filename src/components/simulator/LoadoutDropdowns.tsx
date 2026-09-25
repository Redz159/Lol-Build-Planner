import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { DDragonItem, DDragonRuneTree } from '../../types/ddragon'
import { itemImageUrl, runeIconUrl, runeTreeIconUrl } from '../../lib/ddragon'
import { MAX_SIM_ITEMS, findRune, type ResolvedRunes } from '../../lib/simulatorLoadout'

type Align = 'left' | 'right'

// A summary button that opens its full picker in a dropdown, which closes again on an outside
// click or Escape. `align: 'right'` lines the dropdown up with the button's right edge, so one in
// the right-hand column opens inward instead of off-screen.
function Dropdown({ title, summary, editor, align = 'left', buttonStyle }: { title: string; summary: ReactNode; editor: ReactNode; align?: Align; buttonStyle?: CSSProperties }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button type="button" className={`sim-loadout-button${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)} title={`Edit ${title.toLowerCase()}`} style={buttonStyle}>
        {summary}
      </button>
      {open && (
        <div className="sim-popover" style={align === 'right' ? { left: 'auto', right: 0 } : undefined}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <div className="sim-heading" style={{ margin: 0 }}>
              {title}
            </div>
            <button type="button" className="sim-small-button" style={{ marginLeft: 'auto' }} onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          {editor}
        </div>
      )}
    </div>
  )
}

export function ItemsDropdown({ items, editor, align }: { items: DDragonItem[]; editor: ReactNode; align?: Align }) {
  return (
    <Dropdown
      title="Items"
      align={align}
      editor={editor}
      summary={
        <>
          {Array.from({ length: MAX_SIM_ITEMS }, (_, i) =>
            items[i] ? (
              <img key={i} src={itemImageUrl(items[i].image.full)} alt={items[i].name} title={items[i].name} width={26} height={26} />
            ) : (
              <span key={i} className="sim-empty-slot" />
            ),
          )}
          <span className="sim-caret">▾</span>
        </>
      }
    />
  )
}

interface RunesProps {
  resolved: ResolvedRunes
  trees: DDragonRuneTree[]
  editor: ReactNode
  align?: Align
  // 'page': a small in-game style rune page (keystone and primary runes in one column,
  // secondary runes and shards in the other). 'row': everything in one line.
  layout?: 'page' | 'row'
}

export function RunesDropdown({ resolved, trees, editor, align, layout = 'row' }: RunesProps) {
  const icon = (id: number | undefined, size: number) => {
    const rune = id ? findRune(trees, id) : undefined
    return rune ? (
      <img key={id} src={runeIconUrl(rune.icon)} alt={rune.name} title={rune.name} width={size} height={size} />
    ) : (
      <span className="sim-empty-slot" style={{ width: size, height: size, borderRadius: '50%' }} />
    )
  }
  const secondaryTree = trees.find((t) => t.id === resolved.secondaryTreeId)
  const shards = resolved.shardRows.map((r) => r.candidates.find((o) => o.id === r.picked))
  const shardIcon = (s: (typeof shards)[number], i: number, size: number) =>
    s ? <img key={i} src={runeIconUrl(s.icon)} alt={s.name} title={s.name} width={size} height={size} /> : <span key={i} className="sim-empty-slot" style={{ width: size, height: size, borderRadius: '50%' }} />

  if (layout === 'page') {
    return (
      <Dropdown
        title="Runes"
        align={align}
        editor={editor}
        buttonStyle={{ width: '100%', justifyContent: 'center', padding: '10px 8px' }}
        summary={
          <span className="sim-rune-page">
            <span className="sim-rune-column">
              {icon(resolved.keystoneId, 44)}
              {resolved.primaryRows.map((r) => (
                <span key={r.row}>{icon(r.picked, 26)}</span>
              ))}
            </span>
            <span className="sim-rune-column" style={{ paddingTop: 6 }}>
              {secondaryTree ? <img src={runeTreeIconUrl(secondaryTree.key)} alt={secondaryTree.name} title={secondaryTree.name} width={18} height={18} /> : <span style={{ height: 18 }} />}
              {[0, 1].map((i) => (
                <span key={i}>{icon(resolved.secondary[i], 26)}</span>
              ))}
              {shards.map((s, i) => shardIcon(s, i, 16))}
            </span>
          </span>
        }
      />
    )
  }

  return (
    <Dropdown
      title="Runes"
      align={align}
      editor={editor}
      summary={
        <>
          {icon(resolved.keystoneId, 28)}
          {[...resolved.primaryRows.map((r) => r.picked), ...resolved.secondary].filter(Boolean).map((id) => icon(id, 18))}
          {secondaryTree && <img src={runeTreeIconUrl(secondaryTree.key)} alt={secondaryTree.name} title={secondaryTree.name} width={16} height={16} />}
          {shards.map((s, i) => (s ? shardIcon(s, i, 14) : null))}
          <span className="sim-caret">▾</span>
        </>
      }
    />
  )
}
