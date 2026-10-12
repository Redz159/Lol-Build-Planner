import { Fragment, useState } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import type { ExampleBuild } from '../../types/build'
import type {
  BuildItems,
  ItemExclusionPair,
  ItemNoteGlobalFlags,
  ItemNotes,
  ItemPlacement,
  ItemRequirementPair,
  ItemSituationalFlags,
  ItemSlot,
  ItemSlotNotes,
} from '../../types/items'
import { newId } from '../../lib/id'
import {
  MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT,
  addExampleBuildItem,
  deleteExampleBuild,
  duplicateExampleBuild,
  emptyExampleBuildItems,
  exampleBuildPreviewExcludedPlacementIds,
  exampleSlotCandidates,
  exampleSlotNote,
  moveExampleBuildItem,
  removeExampleBuildItem,
} from '../../lib/exampleBuilds'
import { ItemIcon } from './ItemIcon'
import { ExampleBuildWizard } from './ExampleBuildWizard'
import { situationalDividerStyle, situationalSplit, slotHeaderStyle } from './exampleBuildShared'
import { useConfirm } from '../shared/useConfirm'

interface Props {
  mode: 'view' | 'edit'
  exampleBuilds: ExampleBuild[]
  onChange: (next: ExampleBuild[]) => void
  // The example builds' own fixed slots (EXAMPLE_BUILD_SLOTS, minus any hidden for the role).
  slots: ItemSlot[]
  items: DDragonItem[]
  // The flexible item pool for the active category/loadout and its slots — every example-build
  // candidate list is drawn from here (see exampleSlotCandidates), never from the full item
  // database, since an example build is meant to pick a concrete path through what's already
  // been theorycrafted, not introduce anything new.
  poolSlots: ItemSlot[]
  poolItems: BuildItems
  itemExclusions: ItemExclusionPair[]
  builtinExclusions: ItemExclusionPair[]
  itemRequirements: ItemRequirementPair[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  itemSituational: ItemSituationalFlags
}

// Either "creating a brand-new build" (no id yet) or "re-opened the wizard on an existing one"
// (the pen icon, or clicking one of its items) — the wizard itself doesn't care which, it just
// needs a starting label/items/step and somewhere to send the result.
type WizardTarget = { buildId: string | null; label: string; items: BuildItems; initialStepIndex?: number }

const iconBtnStyle = { padding: '2px 6px', fontSize: 11 }

// Below the flexible per-slot item pool: a handful of concrete, illustrative "here's what to
// buy" builds, each capped at a few alternatives per slot and stacked vertically by preference —
// distinct from the pool's unlimited, horizontally-laid-out candidates.
export function ExampleBuildsSection({
  mode,
  exampleBuilds,
  onChange,
  slots,
  items,
  poolSlots,
  poolItems,
  itemExclusions,
  builtinExclusions,
  itemRequirements,
  itemNotes,
  itemSlotNotes,
  itemNoteGlobal,
  itemSituational,
}: Props) {
  const { confirm, dialog: confirmDialog } = useConfirm()
  const candidatesFor = (slot: ItemSlot): ItemPlacement[] => exampleSlotCandidates(slot, poolSlots, poolItems)
  const noteFor = (slot: ItemSlot, itemId: string) => exampleSlotNote(slot, poolSlots, { itemNotes, itemSlotNotes, itemNoteGlobal }, itemId)
  const [wizardTarget, setWizardTarget] = useState<WizardTarget | null>(null)
  const [picker, setPicker] = useState<{ buildId: string; slotId: string } | null>(null)
  // Per-build "what if I go this way" preview, view mode only — keyed by build id, then slot id
  // to the previewed placement, same shape as the flexible pool's own preview map.
  const [previewByBuild, setPreviewByBuild] = useState<Record<string, Partial<Record<string, string>>>>({})

  if (mode === 'view') {
    if (exampleBuilds.length === 0) return null
    const togglePreview = (buildId: string, slotId: string, placementId: string) => {
      setPreviewByBuild((prev) => {
        const current = prev[buildId] ?? {}
        const next = current[slotId] === placementId ? { ...current, [slotId]: undefined } : { ...current, [slotId]: placementId }
        return { ...prev, [buildId]: next }
      })
    }
    const clearPreview = (buildId: string) => {
      setPreviewByBuild((prev) => {
        if (!prev[buildId]) return prev
        const next = { ...prev }
        delete next[buildId]
        return next
      })
    }
    return (
      <div style={{ marginTop: 24 }}>
        <div style={{ ...slotHeaderStyle, fontSize: 13, marginBottom: 10 }}>Example Builds</div>
        {exampleBuilds.map((build) => {
          const preview = previewByBuild[build.id] ?? {}
          const hasSelection = Object.keys(preview).length > 0
          const excludedPlacementIds = exampleBuildPreviewExcludedPlacementIds(build, preview, itemExclusions, builtinExclusions, itemRequirements)
          return (
            <div key={build.id} className="panel" style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ fontWeight: 600, color: 'var(--gold-bright)' }}>{build.label}</div>
                {hasSelection && (
                  <button type="button" onClick={() => clearPreview(build.id)} style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}>
                    Clear
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {slots.map((slot) => {
                  const placements = (build.items[slot.id] ?? []).filter((p) => !excludedPlacementIds.has(p.id))
                  if (placements.length === 0) return null
                  return (
                    <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={slotHeaderStyle}>{slot.label}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {placements.map((p) => {
                          const item = items.find((i) => i.id === p.itemId)
                          if (!item) return null
                          return (
                            <ItemIcon
                              key={p.id}
                              item={item}
                              size={44}
                              selected={preview[slot.id] === p.id}
                              note={noteFor(slot, item.id)}
                              onClick={() => togglePreview(build.id, slot.id, p.id)}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const pickerBuild = picker ? exampleBuilds.find((b) => b.id === picker.buildId) : undefined
  const pickerSlot = picker ? slots.find((s) => s.id === picker.slotId) : undefined

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ ...slotHeaderStyle, fontSize: 13, marginBottom: 10 }}>Example Builds</div>
      {exampleBuilds.map((build) => (
        <div key={build.id} className="panel" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ fontWeight: 600, color: 'var(--gold-bright)' }}>{build.label}</div>
            <button
              type="button"
              title="Edit in the step-through wizard"
              onClick={() => setWizardTarget({ buildId: build.id, label: build.label, items: build.items })}
              style={iconBtnStyle}
            >
              ✎
            </button>
            <button
              type="button"
              title="Duplicate"
              onClick={() => onChange(duplicateExampleBuild(exampleBuilds, build.id).list)}
              style={iconBtnStyle}
            >
              ⧉
            </button>
            <button
              type="button"
              title="Delete"
              onClick={async () => {
                if (await confirm(`Delete example build "${build.label}"? This can't be undone.`)) {
                  onChange(deleteExampleBuild(exampleBuilds, build.id))
                }
              }}
              style={{ ...iconBtnStyle, color: 'var(--danger)' }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {slots.map((slot, slotIndex) => {
              const placements = build.items[slot.id] ?? []
              return (
                <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 60 }}>
                  <div style={slotHeaderStyle}>{slot.label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                    {placements.map((p, index) => {
                      const item = items.find((i) => i.id === p.itemId)
                      if (!item) return null
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <button
                            type="button"
                            title="Move up"
                            disabled={index === 0}
                            onClick={() => onChange(exampleBuilds.map((b) => (b.id === build.id ? moveExampleBuildItem(b, slot.id, p.id, 'up') : b)))}
                            style={{ ...iconBtnStyle, padding: '0 4px' }}
                          >
                            ▲
                          </button>
                          <ItemIcon
                            item={item}
                            size={40}
                            title={`${item.name} — open in the wizard`}
                            note={noteFor(slot, item.id)}
                            onClick={() =>
                              setWizardTarget({ buildId: build.id, label: build.label, items: build.items, initialStepIndex: slotIndex })
                            }
                          />
                          <button
                            type="button"
                            title="Move down"
                            disabled={index === placements.length - 1}
                            onClick={() =>
                              onChange(exampleBuilds.map((b) => (b.id === build.id ? moveExampleBuildItem(b, slot.id, p.id, 'down') : b)))
                            }
                            style={{ ...iconBtnStyle, padding: '0 4px' }}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            title="Remove"
                            onClick={() =>
                              onChange(exampleBuilds.map((b) => (b.id === build.id ? removeExampleBuildItem(b, slot.id, p.id) : b)))
                            }
                            style={{ ...iconBtnStyle, color: 'var(--danger)' }}
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                    {placements.length < MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT && (
                      // The ▲/▼/× buttons flanking each item icon above aren't symmetric (one
                      // to the left, two to the right), so the icon itself sits left of the
                      // row's true center — matching that with invisible same-size spacers
                      // keeps "+ Add" centered under the icons instead of the whole row.
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <button type="button" aria-hidden="true" tabIndex={-1} style={{ ...iconBtnStyle, padding: '0 4px', visibility: 'hidden' }}>
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => setPicker({ buildId: build.id, slotId: slot.id })}
                          style={{ fontSize: 11, padding: '3px 8px' }}
                        >
                          + Add
                        </button>
                        <button type="button" aria-hidden="true" tabIndex={-1} style={{ ...iconBtnStyle, padding: '0 4px', visibility: 'hidden' }}>
                          ▼
                        </button>
                        <button type="button" aria-hidden="true" tabIndex={-1} style={{ ...iconBtnStyle, visibility: 'hidden' }}>
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setWizardTarget({ buildId: null, label: 'New Example', items: emptyExampleBuildItems() })}
        style={{ padding: '6px 12px', fontSize: 12 }}
      >
        + Add example build
      </button>
      {pickerBuild && pickerSlot && (
        <ExampleBuildItemPicker
          build={pickerBuild}
          slot={pickerSlot}
          candidates={candidatesFor(pickerSlot)}
          noteFor={noteFor}
          items={items}
          itemSituational={itemSituational}
          onAdd={(itemId) =>
            onChange(exampleBuilds.map((b) => (b.id === pickerBuild.id ? addExampleBuildItem(b, pickerSlot.id, itemId) : b)))
          }
          onClose={() => setPicker(null)}
        />
      )}
      {wizardTarget && (
        <ExampleBuildWizard
          key={wizardTarget.buildId ?? 'new'}
          initialLabel={wizardTarget.label}
          initialItems={wizardTarget.items}
          initialStepIndex={wizardTarget.initialStepIndex ?? 0}
          slots={slots}
          candidatesFor={candidatesFor}
          noteFor={noteFor}
          items={items}
          itemSituational={itemSituational}
          onComplete={(label, builtItems) => {
            if (wizardTarget.buildId) {
              onChange(exampleBuilds.map((b) => (b.id === wizardTarget.buildId ? { ...b, label, items: builtItems } : b)))
            } else {
              onChange([...exampleBuilds, { id: newId(), label, items: builtItems }])
            }
            setWizardTarget(null)
          }}
          onCancel={() => setWizardTarget(null)}
        />
      )}
      {confirmDialog}
    </div>
  )
}

// A single slot's candidate list, drawn only from what's already in the flexible pool (see
// exampleSlotCandidates) — no exclusion/requirement filtering here at all (that's a viewing-mode concept, see
// exampleBuildPreviewExcludedPlacementIds above; picking concrete items for an example build is
// never gated on it).
function ExampleBuildItemPicker({
  build,
  slot,
  candidates: pool,
  noteFor,
  items,
  itemSituational,
  onAdd,
  onClose,
}: {
  build: ExampleBuild
  slot: ItemSlot
  candidates: ItemPlacement[]
  noteFor: (slot: ItemSlot, itemId: string) => string | undefined
  items: DDragonItem[]
  itemSituational: ItemSituationalFlags
  onAdd: (itemId: string) => void
  onClose: () => void
}) {
  const placedHere = new Set((build.items[slot.id] ?? []).map((p) => p.itemId))
  const { sorted: candidates, dividerIndex } = situationalSplit(
    pool.filter((p) => !placedHere.has(p.itemId)),
    itemSituational,
  )

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 11, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 20, width: 680, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            Add item to {slot.label} — {build.label}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', padding: '4px 9px' }}>
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {candidates.map((p, index) => {
            const item = items.find((i) => i.id === p.itemId)
            if (!item) return null
            return (
              <Fragment key={p.itemId}>
                {index === dividerIndex && index > 0 && <div style={situationalDividerStyle}>Situational</div>}
                <ItemIcon
                  item={item}
                  size={48}
                  note={noteFor(slot, item.id)}
                  onClick={() => onAdd(item.id)}
                />
              </Fragment>
            )
          })}
          {candidates.length === 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              No items in {slot.label}'s pool yet — add some there first.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
