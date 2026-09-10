import { forwardRef, useState } from 'react'
import type { DDragonChampion } from '../../types/ddragon'
import { championImageUrl } from '../../lib/ddragon'

interface Props {
  champions: DDragonChampion[]
  value: string
  onChange: (championId: string) => void
  onConfirm?: () => void
}

export const ChampionSelect = forwardRef<HTMLInputElement, Props>(function ChampionSelect(
  { champions, value, onChange, onConfirm },
  ref,
) {
  const selected = champions.find((c) => c.id === value)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const filtered = search.trim()
    ? champions.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : champions

  const pick = (champion: DDragonChampion) => {
    onChange(champion.id)
    setSearch('')
    setOpen(false)
    onConfirm?.()
  }

  return (
    <div style={{ position: 'relative', width: 200 }}>
      <input
        ref={ref}
        type="text"
        placeholder="Select champion..."
        value={open ? search : selected?.name ?? ''}
        onFocus={() => {
          setOpen(true)
          setSearch('')
          setHighlight(0)
        }}
        onChange={(e) => {
          setSearch(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, filtered.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const champion = filtered[highlight]
            if (champion) pick(champion)
            else if (!open) onConfirm?.()
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        onBlur={() => setOpen(false)}
        style={{ width: '100%' }}
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 260,
            overflowY: 'auto',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-md)',
            zIndex: 20,
          }}
        >
          {filtered.map((champion, i) => (
            <div
              key={champion.id}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(champion)
              }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                cursor: 'pointer',
                background: i === highlight ? 'var(--bg-panel-raised)' : 'transparent',
              }}
            >
              <img
                src={championImageUrl(champion.image.full)}
                alt=""
                width={22}
                height={22}
                style={{ borderRadius: 4, border: '1px solid var(--border-strong)' }}
              />
              <span>{champion.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
