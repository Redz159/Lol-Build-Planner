import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import {
  effectiveItemNote,
  type BuildItems,
  type ItemNoteGlobalFlags,
  type ItemNotes,
  type ItemPlacement,
  type ItemSituationalFlags,
  type ItemSlot,
  type ItemSlotNotes,
} from '../../types/items'
import { newId } from '../../lib/id'
import { MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT } from '../../lib/exampleBuilds'
import { ItemIcon } from './ItemIcon'
import { situationalDividerStyle, situationalSplit, slotHeaderStyle } from './exampleBuildShared'

// The guided creation/edit flow: step through each slot in order, picking up to a few concrete
// items per slot from what's already in the flexible pool there. Picking a 3rd item auto-advances;
// otherwise "Next" (or Enter) moves on, the progress bar jumps straight to any step, and "Done"
// finishes early with whatever's been picked so far. No exclusion/requirement filtering here —
// that only kicks in later, when viewing the finished build (see the view-mode branch in ExampleBuildsSection).
// Reused for both "+ Add example build" (empty starting items) and the pen icon on an existing
// build (starting items pre-filled) — the wizard itself doesn't distinguish the two.
export function ExampleBuildWizard({
  initialLabel,
  initialItems,
  initialStepIndex = 0,
  slots,
  poolItems,
  items,
  itemNotes,
  itemSlotNotes,
  itemNoteGlobal,
  itemSituational,
  onComplete,
  onCancel,
}: {
  initialLabel: string
  initialItems: BuildItems
  // Lets opening the wizard (e.g. clicking an item in the overview) jump straight to the slot
  // that item belongs to, instead of always starting over at the first slot.
  initialStepIndex?: number
  slots: ItemSlot[]
  poolItems: BuildItems
  items: DDragonItem[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  itemSituational: ItemSituationalFlags
  onComplete: (label: string, items: BuildItems) => void
  onCancel: () => void
}) {
  const [stepIndex, setStepIndex] = useState(initialStepIndex)
  const [selections, setSelections] = useState<BuildItems>(() =>
    Object.fromEntries(slots.map((s) => [s.id, (initialItems[s.id] ?? []).map((p) => ({ ...p }))])),
  )
  const [label, setLabel] = useState(initialLabel)
  const [renamingLabel, setRenamingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(initialLabel)
  const [searchOpen, setSearchOpen] = useState(false)

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
  const { sorted: candidates, dividerIndex } = situationalSplit(poolItems[currentSlot.id] ?? [], itemSituational)

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
    // Also auto-advance once every option this slot's pool offers has been picked — no point
    // sitting on a step with nothing left to click, even below the usual per-slot cap. Guarded
    // on a non-empty pool so an empty-pool slot (nothing to exhaust) doesn't skip ahead the
    // instant a single item is added via the full-database search escape hatch.
    const exhaustedPool = candidates.length > 0 && nextSlotItems.length >= candidates.length
    if (!exists && (nextSlotItems.length >= MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT || exhaustedPool)) {
      advance(nextSelections)
    }
  }

  const commitLabel = () => {
    setLabel(labelDraft.trim() || label)
    setRenamingLabel(false)
  }

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {candidates.map((p, index) => {
              const item = items.find((i) => i.id === p.itemId)
              if (!item) return null
              const selected = currentSelected.some((s) => s.itemId === p.itemId)
              return (
                <Fragment key={p.itemId}>
                  {index === dividerIndex && index > 0 && <div style={situationalDividerStyle}>Situational</div>}
                  <ItemIcon
                    item={item}
                    size={56}
                    selected={selected}
                    note={effectiveItemNote(itemNotes, itemSlotNotes, itemNoteGlobal, currentSlot.id, item.id)}
                    onClick={() => handleItemClick(item.id)}
                  />
                </Fragment>
              )
            })}
            {currentSelected.length < MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT && (
              <button
                type="button"
                title={`Search for any item to add to ${currentSlot.label}`}
                onClick={() => setSearchOpen(true)}
                style={{
                  // Matches an ItemIcon's actual footprint at size=56: the 56px image plus its
                  // own 3px padding and 1px border on each side.
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  border: '2px dotted var(--border-strong)',
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  fontSize: 24,
                  lineHeight: 1,
                }}
              >
                +
              </button>
            )}
            {candidates.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                No items in {currentSlot.label}'s pool yet — search for any item, or skip this slot.
              </div>
            )}
          </div>
        </div>
        {searchOpen && (
          <WizardItemSearchPopup
            slotLabel={currentSlot.label}
            items={items}
            excludeItemIds={new Set(currentSelected.map((p) => p.itemId))}
            itemNotes={itemNotes}
            itemSlotNotes={itemSlotNotes}
            itemNoteGlobal={itemNoteGlobal}
            slotId={currentSlot.id}
            onAdd={(itemId) => {
              handleItemClick(itemId)
              setSearchOpen(false)
            }}
            onClose={() => setSearchOpen(false)}
          />
        )}

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

// The wizard's escape hatch out of "only what's already in the pool": lets a step reach for any
// item in the full database, for a situational pick that was never worth adding to the pool
// itself. Layered above the wizard (which is itself a fixed overlay), so its own z-index has to
// clear it.
function WizardItemSearchPopup({
  slotLabel,
  slotId,
  items,
  excludeItemIds,
  itemNotes,
  itemSlotNotes,
  itemNoteGlobal,
  onAdd,
  onClose,
}: {
  slotLabel: string
  slotId: string
  items: DDragonItem[]
  excludeItemIds: Set<string>
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  onAdd: (itemId: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const results = items.filter((item) => !excludeItemIds.has(item.id) && item.name.toLowerCase().includes(query))

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 11, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ padding: 20, width: 560, maxWidth: '92vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Add any item to {slotLabel}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', padding: '4px 9px' }}>
            ✕
          </button>
        </div>
        <input
          type="text"
          autoFocus
          placeholder="Search any item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
        />
        {/* Fixed height (not just a max) so the popup doesn't resize as the results — the whole
            pool, scrollable, when the search box is empty — narrow while typing. */}
        <div style={{ height: 360, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start' }}>
            {results.map((item) => (
              <ItemIcon
                key={item.id}
                item={item}
                size={48}
                note={effectiveItemNote(itemNotes, itemSlotNotes, itemNoteGlobal, slotId, item.id)}
                onClick={() => onAdd(item.id)}
              />
            ))}
            {results.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No items match "{search}".</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
