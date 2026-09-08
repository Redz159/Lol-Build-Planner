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
              borderRadius: 6,
              padding: 4,
              opacity: tree.id === disabledId ? 0.3 : 1,
              background: 'var(--bg-panel)',
            }}
          >
            <img src={runeIconUrl(tree.icon)} alt={tree.name} width={32} height={32} />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
