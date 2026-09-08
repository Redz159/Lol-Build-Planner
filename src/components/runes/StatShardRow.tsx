import type { StatShardOption } from '../../data/statShards'
import { runeIconUrl } from '../../lib/ddragon'

interface Props {
  options: StatShardOption[]
  selectedId: number
  onSelect: (id: number) => void
}

export function StatShardRow({ options, selectedId, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((opt) => (
        <button
          type="button"
          key={opt.id}
          title={opt.name}
          onClick={() => onSelect(opt.id)}
          style={{
            border: opt.id === selectedId ? '2px solid red' : '1px solid #444',
            borderRadius: '50%',
            padding: 2,
            background: 'transparent',
          }}
        >
          <img src={runeIconUrl(opt.icon)} alt={opt.name} width={18} height={18} />
        </button>
      ))}
    </div>
  )
}
