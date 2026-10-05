import { useState, type ReactNode } from 'react'
import type { DDragonRuneTree } from '../../types/ddragon'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'
import { NoteBadge, NoteEditor } from '../skills/SkillNotes'

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
  // "(x) games" overlay from an API import — undefined when there's none, or the toggle is off.
  gameCounts?: Record<number, number>
  note?: string
  // Present while editing: the "?" corner marker then opens a note field instead of only
  // showing the note.
  onNoteChange?: (note: string) => void
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
  gameCounts,
  note,
  onNoteChange,
}: Props) {
  const [editingNote, setEditingNote] = useState(false)
  const rows = mode === 'primary' ? tree.slots : tree.slots.slice(1)
  const runeSize = compact ? 24 : 26
  const editable = !readOnly && !!onNoteChange

  // Sits on the box's top-right corner, like the "?" on an item with a note.
  let noteMarker: ReactNode = null
  if (editable) {
    const button = (
      <button
        type="button"
        aria-label={note ? 'Edit note' : 'Add note'}
        aria-pressed={editingNote}
        onClick={() => setEditingNote(!editingNote)}
        style={{
          width: 18,
          height: 18,
          padding: 0,
          borderRadius: '50%',
          fontSize: 11,
          fontWeight: 700,
          lineHeight: '16px',
          ...(note || editingNote
            ? { background: 'var(--gold)', borderColor: 'var(--gold)', color: '#0a0e14' }
            : { color: 'var(--text-dim)' }),
        }}
      >
        ?
      </button>
    )
    noteMarker = note && !editingNote ? <Tooltip note={note}>{button}</Tooltip> : button
  } else if (note) {
    noteMarker = <NoteBadge note={note} />
  }

  return (
    <div
      className="panel"
      style={{
        position: 'relative',
        border: `1px solid ${accentColor ?? 'var(--border)'}`,
        padding: compact ? 10 : 12,
        minWidth: compact ? 220 : 240,
      }}
    >
      {noteMarker && <div style={{ position: 'absolute', top: -6, right: -6, display: 'flex' }}>{noteMarker}</div>}
      <div style={{ display: 'flex', gap: compact ? 14 : 18 }}>
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
                          position: 'relative',
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
                        {gameCounts?.[rune.id] !== undefined && (
                          <span
                            style={{
                              position: 'absolute',
                              top: -6,
                              right: -6,
                              fontSize: 10,
                              minWidth: 16,
                              height: 16,
                              padding: '0 2px',
                              background: 'var(--accent)',
                              color: '#0a0e14',
                              fontWeight: 700,
                              borderRadius: '50%',
                              lineHeight: '16px',
                              textAlign: 'center',
                              boxShadow: 'var(--shadow-sm)',
                            }}
                          >
                            {gameCounts[rune.id]}
                          </span>
                        )}
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
      {editable && editingNote && (
        <NoteEditor note={note ?? ''} placeholder="Shown on this tree's box..." onChange={onNoteChange} />
      )}
    </div>
  )
}
