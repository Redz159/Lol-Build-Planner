import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { DDragonItem, DDragonRuneTree } from '../../types/ddragon'
import { itemImageUrl, runeIconUrl, runeTreeIconUrl } from '../../lib/ddragon'
import { MAX_SIM_ITEMS, findRune, type ResolvedRunes } from '../../lib/simulatorLoadout'

interface Props {
  items: DDragonItem[]
  resolved: ResolvedRunes
  trees: DDragonRuneTree[]
  itemEditor: ReactNode
  runeEditor: ReactNode
  // Which edge the dropdown lines up with — 'right' for the target column so it opens inward.
  align?: 'left' | 'right'
}

// One compact row showing the picked items and runes; clicking either half opens its full
// picker in a dropdown, which closes again on an outside click or Escape.
export function LoadoutSummary({ items, resolved, trees, itemEditor, runeEditor, align = 'left' }: Props) {
  const [open, setOpen] = useState<'items' | 'runes' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (which: 'items' | 'runes') => setOpen((o) => (o === which ? null : which))
  const keystone = resolved.keystoneId ? findRune(trees, resolved.keystoneId) : undefined
  const minorRunes = [...resolved.primaryRows.map((r) => r.picked), ...resolved.secondary]
    .map((id) => (id ? findRune(trees, id) : undefined))
    .filter((r) => !!r)
  const secondaryTree = trees.find((t) => t.id === resolved.secondaryTreeId)
  const shards = resolved.shardRows.map((r) => r.candidates.find((o) => o.id === r.picked)).filter((s) => !!s)

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`sim-loadout-button${open === 'items' ? ' open' : ''}`}
          onClick={() => toggle('items')}
          title="Edit items"
        >
          {Array.from({ length: MAX_SIM_ITEMS }, (_, i) =>
            items[i] ? (
              <img key={i} src={itemImageUrl(items[i].image.full)} alt={items[i].name} title={items[i].name} width={26} height={26} />
            ) : (
              <span key={i} className="sim-empty-slot" />
            ),
          )}
          <span className="sim-caret">▾</span>
        </button>
        <button
          type="button"
          className={`sim-loadout-button${open === 'runes' ? ' open' : ''}`}
          onClick={() => toggle('runes')}
          title="Edit runes"
        >
          {keystone ? <img src={runeIconUrl(keystone.icon)} alt={keystone.name} title={keystone.name} width={28} height={28} /> : <span className="sim-empty-slot" />}
          {minorRunes.map((r) => (
            <img key={r.id} src={runeIconUrl(r.icon)} alt={r.name} title={r.name} width={18} height={18} />
          ))}
          {secondaryTree && <img src={runeTreeIconUrl(secondaryTree.key)} alt={secondaryTree.name} title={secondaryTree.name} width={16} height={16} />}
          {shards.map((s, i) => (
            <img key={i} src={runeIconUrl(s.icon)} alt={s.name} title={s.name} width={14} height={14} />
          ))}
          <span className="sim-caret">▾</span>
        </button>
      </div>
      {open && (
        <div className="sim-popover" style={align === 'right' ? { left: 'auto', right: 0 } : undefined}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <div className="sim-heading" style={{ margin: 0 }}>
              {open === 'items' ? 'Items' : 'Runes'}
            </div>
            <button type="button" className="sim-small-button" style={{ marginLeft: 'auto' }} onClick={() => setOpen(null)}>
              ✕
            </button>
          </div>
          {open === 'items' ? itemEditor : runeEditor}
        </div>
      )}
    </div>
  )
}
