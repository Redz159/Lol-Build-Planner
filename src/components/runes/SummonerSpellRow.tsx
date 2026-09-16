import type { DDragonSummonerSpell } from '../../types/ddragon'
import { summonerSpellImageUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  options: DDragonSummonerSpell[]
  selectedIds: string[]
  readOnly?: boolean
  onToggle?: (id: string) => void
}

// Read-only mode only renders the loadout's chosen spells (usually 2, occasionally 3) so the
// view stays compact; edit mode shows the full pool so the user can pick which ones apply.
export function SummonerSpellRow({ options, selectedIds, readOnly, onToggle }: Props) {
  const visible = readOnly ? options.filter((s) => selectedIds.includes(s.id)) : options

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {visible.map((spell) => {
        const selected = selectedIds.includes(spell.id)
        const border = selected ? '2px solid var(--gold)' : '1px solid var(--border-strong)'
        const opacity = selected ? 1 : readOnly ? 0.6 : 0.85

        return (
          <Tooltip key={spell.id} title={spell.name} descriptionHtml={spell.description}>
            <button
              type="button"
              aria-label={spell.name}
              onClick={readOnly ? undefined : () => onToggle?.(spell.id)}
              style={{
                border,
                borderRadius: 6,
                padding: 2,
                opacity,
                background: 'var(--bg-panel-raised)',
                cursor: readOnly ? 'default' : 'pointer',
                boxShadow: selected ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <img
                src={summonerSpellImageUrl(spell.image.full)}
                alt={spell.name}
                width={28}
                height={28}
                style={{
                  display: 'block',
                  borderRadius: 4,
                  filter: selected ? 'none' : 'grayscale(1) brightness(1.3)',
                }}
              />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
