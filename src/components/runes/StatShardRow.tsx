import type { StatShardOption } from '../../data/statShards'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  options: StatShardOption[]
  selectedId: number
  onSelect: (id: number) => void
}

export function StatShardRow({ options, selectedId, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((opt) => (
        <Tooltip key={opt.id} title={opt.name}>
          <button
            type="button"
            aria-label={opt.name}
            onClick={() => onSelect(opt.id)}
            style={{
              border: opt.id === selectedId ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
              borderRadius: '50%',
              padding: 2,
              background: 'var(--bg-panel-raised)',
            }}
          >
            <img src={runeIconUrl(opt.icon)} alt={opt.name} width={18} height={18} />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
