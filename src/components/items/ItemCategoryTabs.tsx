import { useState, type CSSProperties } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import type { ItemCategory, ItemSlot } from '../../types/items'
import { allCategorizedPlacements, categoryHasPlacement } from '../../lib/itemCategories'
import { itemImageUrl } from '../../lib/ddragon'

interface Props {
  categories: ItemCategory[]
  slots: ItemSlot[]
  items: DDragonItem[]
  mode: 'view' | 'edit'
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: (label: string) => void
  onRename: (id: string, label: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleCategoryItem: (categoryId: string, slotId: string, itemId: string) => void
}

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border-strong)'}`,
    background: active ? 'rgba(200, 170, 110, 0.18)' : 'var(--bg-panel-raised)',
    color: active ? 'var(--gold-bright)' : 'var(--text-dim)',
    boxShadow: 'none',
  }
}

const iconBtnStyle: CSSProperties = { padding: '2px 6px', fontSize: 11 }

export function ItemCategoryTabs({ categories, slots, items, mode, activeId, onSelect, onAdd, onRename, onDelete, onDuplicate, onToggleCategoryItem }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newLabelDraft, setNewLabelDraft] = useState('')
  const [quickAddCategoryId, setQuickAddCategoryId] = useState<string | null>(null)

  // Category CRUD (rename/duplicate/delete/add, and the cross-category quick-add) is edit-mode
  // only, matching how slot rename/delete works — view mode only ever switches between tabs.
  const editable = mode === 'edit'
  if (!editable && categories.length === 0) return null

  const startRename = (category: ItemCategory) => {
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
                  onMouseEnter={() => editable && setHoveredId(category.id)}
                  onMouseLeave={() => setHoveredId((prev) => (prev === category.id ? null : prev))}
                >
                  <button type="button" onClick={() => onSelect(category.id)} style={tabStyle(active)}>
                    {category.label}
                  </button>
                  {editable && hoveredId === category.id && (
                    <button
                      type="button"
                      title={`Copy items already in another category into ${category.label}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setQuickAddCategoryId(category.id)
                      }}
                      style={{
                        position: 'absolute',
                        right: 1,
                        top: 1,
                        bottom: 1,
                        padding: '0 6px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        background: 'var(--gold)',
                        color: 'var(--bg-panel)',
                      }}
                    >
                      + add
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
                  <button
                    type="button"
                    title="Delete category"
                    onClick={() => onDelete(category.id)}
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
          onToggle={(slotId, itemId) => onToggleCategoryItem(quickAddCategory.id, slotId, itemId)}
          onClose={() => setQuickAddCategoryId(null)}
        />
      )}
    </div>
  )
}

function CategoryQuickAddPopup({
  category,
  categories,
  slots,
  items,
  onToggle,
  onClose,
}: {
  category: ItemCategory
  categories: ItemCategory[]
  slots: ItemSlot[]
  items: DDragonItem[]
  onToggle: (slotId: string, itemId: string) => void
  onClose: () => void
}) {
  const placements = allCategorizedPlacements(categories, slots)
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 11, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ padding: 18, width: 300, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Add to {category.label}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', padding: '4px 9px' }}>
            ✕
          </button>
        </div>
        {placements.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>No items in any category yet.</div>
        ) : (
          <div>
            {placements.map(({ itemId, slotId }) => {
              const item = items.find((i) => i.id === itemId)
              const slot = slots.find((s) => s.id === slotId)
              if (!item || !slot) return null
              return (
                <label key={`${slotId}::${itemId}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                  <input
                    type="checkbox"
                    checked={categoryHasPlacement(category, slotId, itemId)}
                    onChange={() => onToggle(slotId, itemId)}
                  />
                  <img src={itemImageUrl(item.image.full)} alt="" width={18} height={18} style={{ borderRadius: 3 }} />
                  {item.name}
                  <span style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: 11 }}>{slot.label}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
