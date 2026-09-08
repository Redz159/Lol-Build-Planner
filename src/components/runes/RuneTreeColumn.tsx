import type { DDragonRuneTree } from '../../types/ddragon'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  tree: DDragonRuneTree
  mode: 'primary' | 'secondary'
  keystoneId?: number
  selectedRuneIds: number[]
  onSelectKeystone?: (runeId: number) => void
  onSelectRune: (rowIndex: number, runeId: number) => void
}

export function RuneTreeColumn({
  tree,
  mode,
  keystoneId,
  selectedRuneIds,
  onSelectKeystone,
  onSelectRune,
}: Props) {
  const rows = mode === 'primary' ? tree.slots : tree.slots.slice(1)

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, minWidth: 220, background: 'var(--bg-panel)' }}>
      {rows.map((slot, i) => {
        const isKeystoneRow = mode === 'primary' && i === 0
        const rowIndex = isKeystoneRow ? -1 : mode === 'primary' ? i - 1 : i
        return (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {slot.runes.map((rune) => {
              const selected = isKeystoneRow
                ? rune.id === keystoneId
                : selectedRuneIds.includes(rune.id)
              return (
                <Tooltip key={rune.id} title={rune.name} descriptionHtml={rune.shortDesc}>
                  <button
                    type="button"
                    aria-label={rune.name}
                    onClick={() =>
                      isKeystoneRow ? onSelectKeystone?.(rune.id) : onSelectRune(rowIndex, rune.id)
                    }
                    style={{
                      border: selected ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
                      borderRadius: '50%',
                      padding: 2,
                      background: 'var(--bg-panel-raised)',
                    }}
                  >
                    <img
                      src={runeIconUrl(rune.icon)}
                      alt={rune.name}
                      width={isKeystoneRow ? 32 : 22}
                      height={isKeystoneRow ? 32 : 22}
                    />
                  </button>
                </Tooltip>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
