import { useState, type CSSProperties } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import type { Category } from '../../types/build'
import type { ItemNoteGlobalFlags, ItemNotes, ItemSituationalFlags, ItemSlot, ItemSlotNotes } from '../../types/items'
import { categoryHasPlacement, mergedCategoryItems } from '../../lib/categories'
import { BuildSlotsPanel } from '../items/BuildSlotsPanel'
import { useConfirm } from './useConfirm'

interface Props {
  categories: Category[]
  slots: ItemSlot[]
  items: DDragonItem[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  itemSituational: ItemSituationalFlags
  mode: 'view' | 'edit'
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: (label: string) => void
  onRename: (id: string, label: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onCopyOut?: (id: string) => void
  onToggleCategoryItem: (categoryId: string, slotId: string, itemId: string) => void
}

const QUICK_ADD_BUTTON_WIDTH = 18

function tabStyle(active: boolean, hovered = false, reserveQuickAdd = false): CSSProperties {
  return {
    padding: reserveQuickAdd ? `4px ${QUICK_ADD_BUTTON_WIDTH + 12}px 4px 10px` : '4px 10px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border-strong)'}`,
    background: active ? 'rgba(200, 170, 110, 0.18)' : 'var(--bg-panel-raised)',
    color: active ? 'var(--gold-bright)' : 'var(--text-dim)',
    boxShadow: 'none',
    filter: hovered ? 'brightness(0.85)' : undefined,
  }
}

const iconBtnStyle: CSSProperties = { padding: '2px 6px', fontSize: 11 }

// Sits above the Runes/Items tabs, one level up from both — a category bundles its own rune
// pages and its own item set, so switching category swaps what both of those tabs show.
export function CategoryTabs({
  categories,
  slots,
  items,
  itemNotes,
  itemSlotNotes,
  itemNoteGlobal,
  itemSituational,
  mode,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onDuplicate,
  onCopyOut,
  onToggleCategoryItem,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newLabelDraft, setNewLabelDraft] = useState('')
  const [quickAddCategoryId, setQuickAddCategoryId] = useState<string | null>(null)
  const { confirm, dialog: confirmDialog } = useConfirm()

  // Category CRUD (rename/duplicate/delete/add, and the cross-category quick-add) is edit-mode
  // only, matching how slot rename/delete works — view mode only ever switches between tabs.
  const editable = mode === 'edit'
  if (!editable && categories.length === 0) return null

  const startRename = (category: Category) => {
    setEditingId(category.id)
    setRenameDraft(category.label)
  }

  const commitRename = () => {
    if (editingId) onRename(editingId, renameDraft)
    setEditingId(null)
  }

  const commitAdd = () => {
    if (newLabelDraft.trim()) onAdd(newLabelDraft)
    setAddingNew(false)
    setNewLabelDraft('')
  }

  const quickAddCategory = quickAddCategoryId ? categories.find((c) => c.id === quickAddCategoryId) : undefined

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {categories.length > 1 && (
          <button type="button" onClick={() => onSelect('all')} style={tabStyle(activeId === 'all')}>
            All
          </button>
        )}
        {categories.map((category) => {
          const active = activeId === category.id
          const editing = editable && editingId === category.id
          return (
            <div key={category.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {editing ? (
                <input
                  type="text"
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    else if (e.key === 'Escape') setEditingId(null)
                  }}
                  style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', width: 120 }}
                />
              ) : (
                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredId(category.id)}
                  onMouseLeave={() => setHoveredId((prev) => (prev === category.id ? null : prev))}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(category.id)}
                    style={tabStyle(active, hoveredId === category.id, editable && hoveredId === category.id)}
                  >
                    {category.label}
                  </button>
                  {editable && hoveredId === category.id && (
                    <button
                      type="button"
                      title={`Toggle which items are in ${category.label}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setQuickAddCategoryId(category.id)
                      }}
                      style={{
                        position: 'absolute',
                        right: 1,
                        top: 1,
                        bottom: 1,
                        width: QUICK_ADD_BUTTON_WIDTH,
                        padding: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        background: 'var(--gold)',
                        color: 'var(--bg-panel)',
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              )}
              {editable && active && !editing && (
                <>
                  <button type="button" title="Rename category" onClick={() => startRename(category)} style={iconBtnStyle}>
                    ✎
                  </button>
                  <button type="button" title="Duplicate category" onClick={() => onDuplicate(category.id)} style={iconBtnStyle}>
                    ⧉
                  </button>
                  {onCopyOut && (
                    <button type="button" title="Copy to another role-variant" onClick={() => onCopyOut(category.id)} style={iconBtnStyle}>
                      ⇒
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete category"
                    onClick={async () => {
                      if (await confirm(`Delete category "${category.label}"? This can't be undone.`)) onDelete(category.id)
                    }}
                    style={{ ...iconBtnStyle, color: 'var(--danger)' }}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          )
        })}
        {editable &&
          (addingNew ? (
            <input
              type="text"
              autoFocus
              value={newLabelDraft}
              placeholder="Category name"
              onChange={(e) => setNewLabelDraft(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAdd()
                else if (e.key === 'Escape') setAddingNew(false)
              }}
              style={{ fontSize: 12, padding: '4px 8px', width: 120 }}
            />
          ) : (
            <button type="button" onClick={() => setAddingNew(true)} style={{ padding: '4px 10px', fontSize: 12 }}>
              + Add category
            </button>
          ))}
      </div>
      {editable && quickAddCategory && (
        <CategoryQuickAddPopup
          category={quickAddCategory}
          categories={categories}
          slots={slots}
          items={items}
          itemNotes={itemNotes}
          itemSlotNotes={itemSlotNotes}
          itemNoteGlobal={itemNoteGlobal}
          itemSituational={itemSituational}
          onToggle={(slotId, itemId) => onToggleCategoryItem(quickAddCategory.id, slotId, itemId)}
          onClose={() => setQuickAddCategoryId(null)}
        />
      )}
      {confirmDialog}
    </div>
  )
}

// The same slot/item layout as the "All" tab, except every item that's already in *this*
// category (in that slot) is rung gold, and clicking any item toggles its membership instead of
// switching a build-path preview. Excludes/requires/notes/situational all still apply — they're
// shared globally by item id, so they just come along for free once the item's placed.
function CategoryQuickAddPopup({
  category,
  categories,
  slots,
  items,
  itemNotes,
  itemSlotNotes,
  itemNoteGlobal,
  itemSituational,
  onToggle,
  onClose,
}: {
  category: Category
  categories: Category[]
  slots: ItemSlot[]
  items: DDragonItem[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  itemSituational: ItemSituationalFlags
  onToggle: (slotId: string, itemId: string) => void
  onClose: () => void
}) {
  const mergedItems = mergedCategoryItems(categories, slots)
  const selectedPlacementIds = new Set(
    Object.entries(mergedItems).flatMap(([slotId, placements]) =>
      placements.filter((p) => categoryHasPlacement(category, slotId, p.itemId)).map((p) => p.id),
    ),
  )

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 11, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 18, width: 1100, maxWidth: '92vw', maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Add items to {category.label}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', padding: '4px 9px' }}>
            ✕
          </button>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 10 }}>
          Every item placed in any category. Highlighted ones are already in {category.label} — click to add or remove.
        </div>
        <BuildSlotsPanel
          items={items}
          buildItems={mergedItems}
          itemNotes={itemNotes}
          itemSlotNotes={itemSlotNotes}
          itemNoteGlobal={itemNoteGlobal}
          itemSituational={itemSituational}
          slots={slots}
          mode="view"
          activeSlotId={null}
          onSetActiveSlot={() => {}}
          preview={{}}
          onTogglePreview={() => {}}
          onRemovePlacement={() => {}}
          onOpenPopup={() => {}}
          onDragStartPlacement={() => {}}
          onDropOnSlot={() => {}}
          onDropOnPlacement={() => {}}
          onAddSlot={() => {}}
          onRenameSlot={() => {}}
          onDeleteSlot={() => {}}
          excludedPlacementIds={new Set()}
          hoverOutlines={new Map()}
          onHoverPlacement={() => {}}
          selectedPlacementIds={selectedPlacementIds}
          onToggleSelection={(slotId, placementId) => {
            const placement = mergedItems[slotId]?.find((p) => p.id === placementId)
            if (placement) onToggle(slotId, placement.itemId)
          }}
        />
      </div>
    </div>
  )
}
