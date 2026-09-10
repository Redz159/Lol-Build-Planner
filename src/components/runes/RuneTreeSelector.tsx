import type { DDragonRuneTree } from '../../types/ddragon'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  runeTrees: DDragonRuneTree[]
  selectedId: number
  disabledId?: number
  onSelect: (treeId: number) => void
}

export function RuneTreeSelector({ runeTrees, selectedId, disabledId, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {runeTrees.map((tree) => (
        <Tooltip key={tree.id} title={tree.name}>
          <button
            type="button"
            disabled={tree.id === disabledId}
            onClick={() => onSelect(tree.id)}
            aria-label={tree.name}
            style={{
              border: tree.id === selectedId ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 5,
              opacity: tree.id === disabledId ? 0.3 : 1,
              background: 'var(--bg-panel)',
              boxShadow: tree.id === selectedId ? '0 0 0 3px rgba(200, 170, 110, 0.18)' : 'var(--shadow-sm)',
            }}
          >
            <img src={runeIconUrl(tree.icon)} alt={tree.name} width={38} height={38} style={{ display: 'block' }} />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
