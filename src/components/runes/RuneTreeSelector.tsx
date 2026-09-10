import type { DDragonRuneTree } from '../../types/ddragon'
import { runeTreeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'
import { treeAccentColor } from '../../lib/runeTreeColors'

interface Props {
  runeTrees: DDragonRuneTree[]
  selectedId: number
  disabledId?: number
  onSelect: (treeId: number) => void
}

export function RuneTreeSelector({ runeTrees, selectedId, disabledId, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {runeTrees.map((tree) => {
        const disabled = tree.id === disabledId
        const selected = tree.id === selectedId
        const accent = treeAccentColor(tree.key)
        return (
          <Tooltip key={tree.id} title={tree.name}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(tree.id)}
              aria-label={tree.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 46,
                height: 46,
                border: selected ? `2px solid ${accent}` : `1px solid ${disabled ? 'var(--border-strong)' : `${accent}55`}`,
                borderRadius: 10,
                opacity: disabled ? 0.35 : 1,
                background: selected ? `linear-gradient(160deg, ${accent}40, ${accent}14)` : 'var(--bg-panel)',
                boxShadow: selected ? `0 0 10px ${accent}66, var(--shadow-sm)` : 'var(--shadow-sm)',
              }}
            >
              <img
                src={runeTreeIconUrl(tree.key)}
                alt={tree.name}
                width={32}
                height={32}
                style={{
                  display: 'block',
                  filter: disabled ? 'grayscale(1)' : 'none',
                  opacity: selected || disabled ? 1 : 0.75,
                }}
              />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
