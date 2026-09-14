import type { ReactNode } from 'react'
import type { DDragonRuneTree } from '../../types/ddragon'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  tree: DDragonRuneTree
  mode: 'primary' | 'secondary'
  keystoneId?: number
  preferredKeystone?: boolean
  selectedRuneIds: number[]
  preferredRuneIds?: number[]
  readOnly?: boolean
  compact?: boolean
  accentColor?: string
  extra?: ReactNode
  onSelectKeystone?: (runeId: number, preferred: boolean) => void
  onSelectRune?: (rowIndex: number, runeId: number, preferred: boolean) => void
}

export function RuneTreeColumn({
  tree,
  mode,
  keystoneId,
  preferredKeystone,
  selectedRuneIds,
  preferredRuneIds,
  readOnly,
  compact,
  accentColor,
  extra,
  onSelectKeystone,
  onSelectRune,
}: Props) {
  const rows = mode === 'primary' ? tree.slots : tree.slots.slice(1)
  const runeSize = compact ? 24 : 26

  return (
    <div
      className="panel"
      style={{
        display: 'flex',
        gap: compact ? 14 : 18,
        border: `1px solid ${accentColor ?? 'var(--border)'}`,
        padding: compact ? 10 : 12,
        minWidth: compact ? 220 : 240,
      }}
    >
      <div>
        {rows.map((slot, i) => {
          const isKeystoneRow = mode === 'primary' && i === 0
          const rowIndex = isKeystoneRow ? -1 : mode === 'primary' ? i - 1 : i
          return (
            <div key={i} style={{ display: 'flex', gap: compact ? 7 : 8, marginBottom: compact ? 7 : 8 }}>
              {slot.runes.map((rune) => {
                const selected = isKeystoneRow
                  ? rune.id === keystoneId
                  : selectedRuneIds.includes(rune.id)
                const preferred = isKeystoneRow
                  ? Boolean(preferredKeystone) && rune.id === keystoneId
                  : (preferredRuneIds?.includes(rune.id) ?? false)

                let border: string
                let opacity: number
                if (preferred) {
                  border = '3px solid var(--preferred)'
                  opacity = 1
                } else if (selected) {
                  border = `2px solid ${accentColor ?? 'var(--gold)'}`
                  opacity = readOnly ? 0.85 : 1
                } else {
                  border = '1px solid var(--border-strong)'
                  opacity = readOnly ? 0.6 : 0.85
                }

                return (
                  <Tooltip
                    key={rune.id}
                    title={rune.name}
                    descriptionHtml={rune.shortDesc}
                    extra={
                      !readOnly && (
                        <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12, marginBottom: 6 }}>
                          Ctrl+click to mark as preferred
                        </div>
                      )
                    }
                  >
                    <button
                      type="button"
                      aria-label={rune.name}
                      onClick={
                        readOnly
                          ? undefined
                          : (e) =>
                              isKeystoneRow
                                ? onSelectKeystone?.(rune.id, e.ctrlKey || e.metaKey)
                                : onSelectRune?.(rowIndex, rune.id, e.ctrlKey || e.metaKey)
                      }
                      style={{
                        border,
                        borderRadius: '50%',
                        padding: 3,
                        opacity,
                        background: 'var(--bg-panel-raised)',
                        cursor: readOnly ? 'default' : 'pointer',
                        boxShadow: preferred || selected ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      <img
                        src={runeIconUrl(rune.icon)}
                        alt={rune.name}
                        width={isKeystoneRow ? 40 : runeSize}
                        height={isKeystoneRow ? 40 : runeSize}
                        style={{
                          display: 'block',
                          borderRadius: '50%',
                          filter: selected ? 'none' : 'grayscale(1) brightness(1.3)',
                        }}
                      />
                    </button>
                  </Tooltip>
                )
              })}
            </div>
          )
        })}
      </div>
      {extra}
    </div>
  )
}
