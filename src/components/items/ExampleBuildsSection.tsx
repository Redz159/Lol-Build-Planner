import { useCallback, useEffect, useRef, useState } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import type { ExampleBuild } from '../../types/build'
import {
  effectiveItemNote,
  type BuildItems,
  type ItemExclusionPair,
  type ItemNoteGlobalFlags,
  type ItemNotes,
  type ItemPlacement,
  type ItemRequirementPair,
  type ItemSlot,
  type ItemSlotNotes,
} from '../../types/items'
import { newId } from '../../lib/id'
import {
  MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT,
  addExampleBuildItem,
  deleteExampleBuild,
  duplicateExampleBuild,
  exampleBuildPreviewExcludedPlacementIds,
  moveExampleBuildItem,
  removeExampleBuildItem,
} from '../../lib/exampleBuilds'
import { ItemIcon } from './ItemIcon'

interface Props {
  mode: 'view' | 'edit'
  exampleBuilds: ExampleBuild[]
  onChange: (next: ExampleBuild[]) => void
  slots: ItemSlot[]
  items: DDragonItem[]
  // The flexible per-slot item pool for the active category/loadout — every example-build
  // candidate list is drawn from here (whatever's already placed in that slot), never from the
  // full item database, since an example build is meant to pick a concrete path through what's
  // already been theorycrafted, not introduce anything new.
  poolItems: BuildItems
  itemExclusions: ItemExclusionPair[]
  builtinExclusions: ItemExclusionPair[]
  itemRequirements: ItemRequirementPair[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
}

// Either "creating a brand-new build" (no id yet) or "re-opened the wizard on an existing one"
// (the pen icon) — the wizard itself doesn't care which, it just needs a starting label/items and
// somewhere to send the result.
type WizardTarget = { buildId: string | null; label: string; items: BuildItems }

const iconBtnStyle = { padding: '2px 6px', fontSize: 11 }
const slotHeaderStyle = { color: 'var(--gold)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 }

function emptySlotItems(slots: ItemSlot[]): BuildItems {
  return Object.fromEntries(slots.map((s) => [s.id, []]))
}

// Below the flexible per-slot item pool: a handful of concrete, illustrative "here's what to
// buy" builds, each capped at a few alternatives per slot and stacked vertically by preference —
// distinct from the pool's unlimited, horizontally-laid-out candidates.
export function ExampleBuildsSection({
  mode,
  exampleBuilds,
  onChange,
  slots,
  items,
  poolItems,
  itemExclusions,
  builtinExclusions,
  itemRequirements,
  itemNotes,
  itemSlotNotes,
  itemNoteGlobal,
}: Props) {
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
    return (
      <div style={{ marginTop: 24 }}>
        <div style={{ ...slotHeaderStyle, fontSize: 13, marginBottom: 10 }}>Example Builds</div>
        {exampleBuilds.map((build) => {
          const preview = previewByBuild[build.id] ?? {}
          const excludedPlacementIds = exampleBuildPreviewExcludedPlacementIds(build, preview, itemExclusions, builtinExclusions, itemRequirements)
          return (
            <div key={build.id} className="panel" style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, color: 'var(--gold-bright)', marginBottom: 10 }}>{build.label}</div>
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
                              size={36}
                              selected={preview[slot.id] === p.id}
                              note={effectiveItemNote(itemNotes, itemSlotNotes, itemNoteGlobal, slot.id, item.id)}
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
              onClick={() => onChange(duplicateExampleBuild(exampleBuilds, slots, build.id).list)}
              style={iconBtnStyle}
            >
              ⧉
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => onChange(deleteExampleBuild(exampleBuilds, build.id))}
              style={{ ...iconBtnStyle, color: 'var(--danger)' }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {slots.map((slot) => {
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
                            size={32}
                            note={effectiveItemNote(itemNotes, itemSlotNotes, itemNoteGlobal, slot.id, item.id)}
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
                      <button
                        type="button"
                        onClick={() => setPicker({ buildId: build.id, slotId: slot.id })}
                        style={{ fontSize: 11, padding: '3px 8px' }}
                      >
                        + Add
                      </button>
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
        onClick={() => setWizardTarget({ buildId: null, label: 'New Example', items: emptySlotItems(slots) })}
        style={{ padding: '6px 12px', fontSize: 12 }}
      >
        + Add example build
      </button>
      {pickerBuild && pickerSlot && (
        <ExampleBuildItemPicker
          build={pickerBuild}
          slot={pickerSlot}
          poolItems={poolItems}
          items={items}
          itemNotes={itemNotes}
          itemSlotNotes={itemSlotNotes}
          itemNoteGlobal={itemNoteGlobal}
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
          slots={slots}
          poolItems={poolItems}
          items={items}
          itemNotes={itemNotes}
          itemSlotNotes={itemSlotNotes}
          itemNoteGlobal={itemNoteGlobal}
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
    </div>
  )
}

// A single slot's candidate list, drawn only from what's already in the flexible pool for that
// slot — no exclusion/requirement filtering here at all (that's a viewing-mode concept, see
// exampleBuildPreviewExcludedPlacementIds above; picking concrete items for an example build is
// never gated on it).
function ExampleBuildItemPicker({
  build,
  slot,
  poolItems,
  items,
  itemNotes,
  itemSlotNotes,
  itemNoteGlobal,
  onAdd,
  onClose,
}: {
  build: ExampleBuild
  slot: ItemSlot
  poolItems: BuildItems
  items: DDragonItem[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  onAdd: (itemId: string) => void
  onClose: () => void
}) {
  const placedHere = new Set((build.items[slot.id] ?? []).map((p) => p.itemId))
  const candidates = (poolItems[slot.id] ?? []).filter((p) => !placedHere.has(p.itemId))

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
          {candidates.map((p) => {
            const item = items.find((i) => i.id === p.itemId)
            if (!item) return null
            return (
              <ItemIcon
                key={p.itemId}
                item={item}
                size={48}
                note={effectiveItemNote(itemNotes, itemSlotNotes, itemNoteGlobal, slot.id, item.id)}
                onClick={() => onAdd(item.id)}
              />
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

// The guided creation/edit flow: step through each slot in order, picking up to a few concrete
// items per slot from what's already in the flexible pool there. Picking a 3rd item auto-advances;
// otherwise "Next" (or Enter) moves on, the progress bar jumps straight to any step, and "Done"
// finishes early with whatever's been picked so far. No exclusion/requirement filtering here —
// that only kicks in later, when viewing the finished build (see the view-mode branch above).
// Reused for both "+ Add example build" (empty starting items) and the pen icon on an existing
// build (starting items pre-filled) — the wizard itself doesn't distinguish the two.
function ExampleBuildWizard({
  initialLabel,
  initialItems,
  slots,
  poolItems,
  items,
  itemNotes,
  itemSlotNotes,
  itemNoteGlobal,
  onComplete,
  onCancel,
}: {
  initialLabel: string
  initialItems: BuildItems
  slots: ItemSlot[]
  poolItems: BuildItems
  items: DDragonItem[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  onComplete: (label: string, items: BuildItems) => void
  onCancel: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [selections, setSelections] = useState<BuildItems>(() =>
    Object.fromEntries(slots.map((s) => [s.id, (initialItems[s.id] ?? []).map((p) => ({ ...p }))])),
  )
  const [label, setLabel] = useState(initialLabel)
  const [renamingLabel, setRenamingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(initialLabel)

  // Ignore every key for one frame after mount — guards against a stray Enter/repeat from
  // whatever interaction just opened the wizard (e.g. holding Enter a beat too long) landing on
  // this component and immediately skipping past the first step.
  const readyRef = useRef(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      readyRef.current = true
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  const advance = useCallback(
    (currentSelections: BuildItems = selections) => {
      if (stepIndex >= slots.length - 1) onComplete(label, currentSelections)
      else setStepIndex((i) => i + 1)
    },
    [stepIndex, slots.length, selections, label, onComplete],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!readyRef.current || e.repeat) return
      if (renamingLabel) return
      if (e.key === 'ArrowRight') setStepIndex((i) => Math.min(i + 1, slots.length - 1))
      else if (e.key === 'ArrowLeft') setStepIndex((i) => Math.max(i - 1, 0))
      else if (e.key === 'Enter') advance()
      else if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [stepIndex, selections, slots.length, advance, onCancel, renamingLabel])

  const currentSlot = slots[stepIndex]
  const currentSelected = selections[currentSlot.id] ?? []

  const handleItemClick = (itemId: string) => {
    const exists = currentSelected.some((p) => p.itemId === itemId)
    let nextSlotItems: ItemPlacement[]
    if (exists) {
      nextSlotItems = currentSelected.filter((p) => p.itemId !== itemId)
    } else {
      if (currentSelected.length >= MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT) return
      nextSlotItems = [...currentSelected, { id: newId(), itemId }]
    }
    const nextSelections = { ...selections, [currentSlot.id]: nextSlotItems }
    setSelections(nextSelections)
    if (!exists && nextSlotItems.length >= MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT) advance(nextSelections)
  }

  const commitLabel = () => {
    setLabel(labelDraft.trim() || label)
    setRenamingLabel(false)
  }

  const candidates = poolItems[currentSlot.id] ?? []
  const isLastStep = stepIndex >= slots.length - 1

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 11, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div
        className="panel"
        style={{ padding: 24, width: 960, maxWidth: '94vw', height: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, gap: 8 }}>
          {renamingLabel ? (
            <input
              type="text"
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                // Stop Enter/Escape here from also reaching the wizard's own document-level
                // shortcut handler below, which would otherwise advance/cancel the step at the
                // same time this just renames the build.
                e.stopPropagation()
                if (e.key === 'Enter') commitLabel()
                else if (e.key === 'Escape') {
                  setLabelDraft(label)
                  setRenamingLabel(false)
                }
              }}
              style={{ fontSize: 17, fontWeight: 600, padding: '4px 8px', width: 260 }}
            />
          ) : (
            <div
              onDoubleClick={() => {
                setLabelDraft(label)
                setRenamingLabel(true)
              }}
              title="Double-click to rename"
              style={{ fontWeight: 600, fontSize: 17, cursor: 'text' }}
            >
              {label}
            </div>
          )}
          <button type="button" onClick={onCancel} aria-label="Cancel" style={{ marginLeft: 'auto', padding: '4px 9px' }}>
            ✕ Cancel
          </button>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 16 }}>Double-click the name to rename it</div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {slots.map((slot, index) => {
            const active = index === stepIndex
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setStepIndex(index)}
                style={{
                  fontSize: 12,
                  padding: '7px 12px',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--border-strong)'}`,
                  color: active ? 'var(--gold-bright)' : 'var(--text-dim)',
                  background: active ? 'rgba(200, 170, 110, 0.18)' : 'var(--bg-panel-raised)',
                }}
              >
                {slot.label}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
          <div style={{ ...slotHeaderStyle, fontSize: 13, marginBottom: 14 }}>{currentSlot.label}</div>
          {candidates.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>
              No items in {currentSlot.label}'s pool yet — add some there first, or skip this slot.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {candidates.map((p) => {
                const item = items.find((i) => i.id === p.itemId)
                if (!item) return null
                const selected = currentSelected.some((s) => s.itemId === p.itemId)
                return (
                  <ItemIcon
                    key={p.itemId}
                    item={item}
                    size={56}
                    selected={selected}
                    note={effectiveItemNote(itemNotes, itemSlotNotes, itemNoteGlobal, currentSlot.id, item.id)}
                    onClick={() => handleItemClick(item.id)}
                  />
                )
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            Step {stepIndex + 1} of {slots.length} — click items to select up to {MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT}, use ←/→ to move between
            slots
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={() => onComplete(label, selections)} style={{ padding: '7px 14px', fontSize: 13 }}>
            Done
          </button>
          <button
            type="button"
            onClick={() => advance()}
            style={{ padding: '7px 16px', fontSize: 13, borderColor: 'var(--gold)', color: 'var(--gold-bright)' }}
          >
            {isLastStep ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
