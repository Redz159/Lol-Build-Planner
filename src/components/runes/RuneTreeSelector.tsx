import type { DDragonRuneTree } from '../../types/ddragon'
import { runeIconUrl } from '../../lib/ddragon'

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
        <button
          type="button"
          key={tree.id}
          disabled={tree.id === disabledId}
          onClick={() => onSelect(tree.id)}
          title={tree.name}
          style={{
            border: tree.id === selectedId ? '2px solid red' : '1px solid #444',
            borderRadius: 6,
            padding: 4,
            opacity: tree.id === disabledId ? 0.3 : 1,
            background: 'transparent',
          }}
        >
          <img src={runeIconUrl(tree.icon)} alt={tree.name} width={32} height={32} />
        </button>
      ))}
    </div>
  )
}
