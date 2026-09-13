import { useMemo, useRef, useState } from 'react'
import { useGameData } from '../../state/GameDataContext'
import type { RunePage } from '../../types/runes'
import { RunePageEditor } from './RunePageEditor'
import {
  createRunePage,
  duplicateRunePage,
  setPreferredKeystone,
  groupRunePages,
  reorderPageGroups,
} from '../../lib/runeRules'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  pages: RunePage[]
  onChange: (pages: RunePage[]) => void
  initialKeystoneId?: number | null
  onGroupSelect?: (keystoneId: number) => void
  // Hands the currently visible page(s) — the selected keystone group, or a single draft page —
  // off to the caller for a cross-category/cross-loadout "Copy to..." action. Left out of this
  // component entirely since it has no notion of loadouts or categories.
  onCopyOut?: (pages: RunePage[]) => void
}

type Selection = { kind: 'group'; keystoneId: number } | { kind: 'draft'; pageId: string }

function sameSelection(a: Selection, b: Selection): boolean {
  if (a.kind === 'group' && b.kind === 'group') return a.keystoneId === b.keystoneId
  if (a.kind === 'draft' && b.kind === 'draft') return a.pageId === b.pageId
  return false
}

export function RunePagesEditor({ pages, onChange, initialKeystoneId, onGroupSelect, onCopyOut }: Props) {
  const { runeTrees } = useGameData()
  const [selected, setSelected] = useState<Selection | null>(
    initialKeystoneId != null ? { kind: 'group', keystoneId: initialKeystoneId } : null,
  )
  const dragGroupIndexRef = useRef<number | null>(null)

  const select = (next: Selection) => {
    setSelected(next)
    if (next.kind === 'group') onGroupSelect?.(next.keystoneId)
  }

  const groups = useMemo(() => groupRunePages(pages), [pages])
  const draftPages = pages.filter((p) => !p.keystoneId)

  const availableSelections: Selection[] = [
    ...groups.map((g): Selection => ({ kind: 'group', keystoneId: g.keystoneId })),
    ...draftPages.map((p): Selection => ({ kind: 'draft', pageId: p.id })),
  ]
  const activeSelection =
    (selected && availableSelections.find((s) => sameSelection(s, selected))) || availableSelections[0] || null

  const visiblePages =
    activeSelection === null
      ? []
      : activeSelection.kind === 'group'
        ? pages.filter((p) => p.keystoneId === activeSelection.keystoneId)
        : pages.filter((p) => p.id === activeSelection.pageId)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {groups.map((group, groupIndex) => {
            const tree = runeTrees.find((t) => t.id === group.primaryTreeId)
            const keystone = tree?.slots[0]?.runes.find((r) => r.id === group.keystoneId)
            if (!tree || !keystone) return null
            const isActive = activeSelection?.kind === 'group' && activeSelection.keystoneId === group.keystoneId
            return (
              <Tooltip key={group.keystoneId} title={keystone.name}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    dragGroupIndexRef.current = groupIndex
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const from = dragGroupIndexRef.current
                    dragGroupIndexRef.current = null
                    if (from === null || from === groupIndex) return
                    onChange(reorderPageGroups(pages, groups[from].keystoneId, group.keystoneId))
                  }}
                  onClick={() => select({ kind: 'group', keystoneId: group.keystoneId })}
                  style={{
                    border: isActive ? '3px solid var(--gold)' : '1px solid var(--border-strong)',
                    borderRadius: '50%',
                    padding: 5,
                    background: isActive ? 'var(--bg-panel-raised)' : 'var(--bg-panel)',
                    boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    cursor: 'grab',
                  }}
                >
                  <img
                    src={runeIconUrl(keystone.icon)}
                    alt={keystone.name}
                    width={38}
                    height={38}
                    style={{ display: 'block', borderRadius: '50%' }}
                  />
                </button>
              </Tooltip>
            )
          })}
          {draftPages.map((page) => {
            const isActive = activeSelection?.kind === 'draft' && activeSelection.pageId === page.id
            return (
              <Tooltip key={page.id} title="Rune page without a keystone yet">
                <button
                  type="button"
                  onClick={() => select({ kind: 'draft', pageId: page.id })}
                  style={{
                    border: isActive ? '2px solid var(--gold)' : '1px dashed var(--border-strong)',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    background: isActive ? 'var(--bg-panel-raised)' : 'var(--bg-panel)',
                    color: 'var(--text-dim)',
                    fontSize: 18,
                    fontWeight: 600,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  ?
                </button>
              </Tooltip>
            )
          })}
          <Tooltip title="Add rune page">
            <button
              type="button"
              onClick={() => {
                const page = createRunePage()
                onChange([...pages, page])
                select({ kind: 'draft', pageId: page.id })
              }}
              style={{
                border: '1px dashed var(--border-strong)',
                borderRadius: '50%',
                width: 48,
                height: 48,
                background: 'var(--bg-panel)',
                color: 'var(--text-dim)',
                fontSize: 20,
                lineHeight: 1,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              +
            </button>
          </Tooltip>
        </div>
        {onCopyOut && activeSelection && visiblePages.length > 0 && (
          <button type="button" onClick={() => onCopyOut(visiblePages)} style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 10px' }}>
            Copy to...
          </button>
        )}
      </div>

      {visiblePages.map((page) => (
        <RunePageEditor
          key={page.id}
          page={page}
          onChange={(next) => {
            onChange(pages.map((p) => (p.id === page.id ? next : p)))
            if (next.keystoneId !== page.keystoneId) {
              select(
                next.keystoneId
                  ? { kind: 'group', keystoneId: next.keystoneId }
                  : { kind: 'draft', pageId: next.id },
              )
            }
          }}
          onDuplicate={() => {
            const duplicate = duplicateRunePage(page)
            const idx = pages.findIndex((p) => p.id === page.id)
            const next = [...pages]
            next.splice(idx + 1, 0, duplicate)
            onChange(next)
            select({ kind: 'draft', pageId: duplicate.id })
          }}
          onRemove={() => onChange(pages.filter((p) => p.id !== page.id))}
          onSetPreferredKeystone={(preferred) => onChange(setPreferredKeystone(pages, page.id, preferred))}
        />
      ))}
    </div>
  )
}
