import { Fragment, useEffect, useState } from 'react'
import type { SkillKey, SkillOrder } from '../../types/build'
import type { DDragonChampionSpell } from '../../types/ddragon'
import { getChampionSpells, itemImageUrl, summonerSpellImageUrl } from '../../lib/ddragon'
import {
  ELIXIR_OF_SKILL_IMAGE,
  ELIXIR_POINT_INDEX,
  SKILL_KEYS,
  SKILL_POINTS,
  autoFillSkillOrder,
  emptySkillOrder,
  setSkillPoint,
} from '../../lib/skillOrder'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  championId: string
  order: SkillOrder
  // Triple Tonic's Elixir of Skill: the 10th point's column header becomes the elixir icon and the
  // later columns read 10…17 (the elixir replaces the level-18 point).
  showElixir: boolean
  readOnly: boolean
  onChange?: (order: SkillOrder) => void
}

// The grid stretches to its container's width; cells stay square and grow with it.
const ROW_ICON = 48
const ELIXIR_ICON = 28
// Every max order over the three basics, offered as one-click auto-fill presets.
const MAX_ORDERS: SkillKey[][] = [
  ['Q', 'W', 'E'],
  ['Q', 'E', 'W'],
  ['W', 'Q', 'E'],
  ['W', 'E', 'Q'],
  ['E', 'Q', 'W'],
  ['E', 'W', 'Q'],
]
const FILLED = 'color-mix(in srgb, var(--accent) 55%, var(--bg-panel-raised))'

// An ability's icon with its Q/W/E/R key in the corner — just the key on a blank tile until the
// champion's spell data has loaded.
function AbilityIcon({ skillKey, spell, size }: { skillKey: SkillKey; spell?: DDragonChampionSpell; size: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {spell ? (
        <img
          src={summonerSpellImageUrl(spell.image.full)}
          alt={spell.name}
          width={size}
          height={size}
          style={{ display: 'block', borderRadius: 4, border: '1px solid var(--border-strong)' }}
        />
      ) : (
        <div style={{ width: size, height: size, borderRadius: 4, border: '1px solid var(--border-strong)', background: 'var(--bg-panel-raised)' }} />
      )}
      <span
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          fontSize: size >= 40 ? 12 : 10,
          fontWeight: 700,
          lineHeight: 1,
          padding: '1px 3px',
          borderRadius: 3,
          background: 'var(--bg)',
          color: 'var(--gold-bright)',
          pointerEvents: 'none',
        }}
      >
        {skillKey}
      </span>
    </div>
  )
}

function MaxOrderIcons({ priority, spells }: { priority: SkillKey[]; spells: DDragonChampionSpell[] }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {priority.map((key, i) => (
        <Fragment key={key}>
          {i > 0 && <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>&gt;</span>}
          <AbilityIcon skillKey={key} spell={spells[SKILL_KEYS.indexOf(key)]} size={30} />
        </Fragment>
      ))}
    </span>
  )
}

// A native <select> can't show the ability icons, so this is a small button + popup list; it
// closes on blur/Escape the same way ChampionSelect's list does.
function AutoFillDropdown({ spells, onPick }: { spells: DDragonChampionSpell[]; onPick: (priority: SkillKey[]) => void }) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        style={{ fontSize: 13, padding: '6px 12px' }}
      >
        Auto-fill ▾
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-md)',
            padding: 4,
            zIndex: 20,
          }}
        >
          {MAX_ORDERS.map((priority, i) => (
            <div
              key={priority.join('')}
              role="option"
              aria-selected={false}
              aria-label={`Max ${priority.join(' > ')}`}
              title={`Max ${priority.join(' > ')}, R whenever possible`}
              onMouseDown={(e) => {
                e.preventDefault()
                onPick(priority)
                setOpen(false)
              }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: '5px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                background: i === highlight ? 'var(--bg-panel-raised)' : 'transparent',
              }}
            >
              <MaxOrderIcons priority={priority} spells={spells} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// One row per ability, one column per skill point, with the level numbers in a header row
// above the columns rather than inside the chosen cells.
export function SkillOrderGrid({ championId, order, showElixir, readOnly, onChange }: Props) {
  const [spells, setSpells] = useState<DDragonChampionSpell[]>([])

  useEffect(() => {
    let cancelled = false
    getChampionSpells(championId)
      .then((s) => {
        if (!cancelled) setSpells(s)
      })
      .catch(() => {
        // Icons are cosmetic — the grid still works with just the Q/W/E/R letters.
      })
    return () => {
      cancelled = true
    }
  }, [championId])

  const columnLabel = (i: number) => {
    if (!showElixir || i < ELIXIR_POINT_INDEX) return String(i + 1)
    if (i === ELIXIR_POINT_INDEX) {
      return (
        <Tooltip title="Elixir of Skill" descriptionHtml="Triple Tonic grants it at level 9 — its skill point is spent here.">
          <img src={itemImageUrl(ELIXIR_OF_SKILL_IMAGE)} alt="Elixir of Skill" width={ELIXIR_ICON} height={ELIXIR_ICON} style={{ display: 'block', borderRadius: 3 }} />
        </Tooltip>
      )
    }
    return String(i)
  }

  return (
    <div>
      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12, fontSize: 13, color: 'var(--text-dim)' }}>
          <AutoFillDropdown spells={spells} onPick={(priority) => onChange?.(autoFillSkillOrder(priority, showElixir))} />
          <button
            type="button"
            onClick={() => onChange?.(emptySkillOrder())}
            disabled={order.every((k) => k === null)}
            style={{ fontSize: 13, padding: '6px 12px', marginLeft: 8, color: 'var(--danger)' }}
          >
            Clear
          </button>
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${ROW_ICON}px repeat(${SKILL_POINTS}, minmax(0, 1fr))`,
          gap: 4,
          alignItems: 'center',
        }}
      >
        <div />
        {Array.from({ length: SKILL_POINTS }, (_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>
            {columnLabel(i)}
          </div>
        ))}

        {SKILL_KEYS.map((key, row) => {
          const spell = spells[row]
          return [
            spell ? (
              <Tooltip key={`${key}-icon`} title={spell.name} descriptionHtml={spell.description}>
                <AbilityIcon skillKey={key} spell={spell} size={ROW_ICON} />
              </Tooltip>
            ) : (
              <AbilityIcon key={`${key}-icon`} skillKey={key} size={ROW_ICON} />
            ),
            ...Array.from({ length: SKILL_POINTS }, (_, i) => {
              const filled = order[i] === key
              return (
                <button
                  key={`${key}-${i}`}
                  type="button"
                  aria-label={`${key} at point ${i + 1}`}
                  aria-pressed={filled}
                  disabled={readOnly}
                  onClick={readOnly ? undefined : () => onChange?.(setSkillPoint(order, i, key))}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    padding: 0,
                    borderRadius: 3,
                    border: '1px solid var(--border-strong)',
                    background: filled ? FILLED : 'var(--bg)',
                    boxShadow: 'none',
                    cursor: readOnly ? 'default' : 'pointer',
                    opacity: 1,
                  }}
                />
              )
            }),
          ]
        })}
      </div>
    </div>
  )
}
