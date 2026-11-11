import { useState, type CSSProperties } from 'react'
import type { Category, CategoryIcon } from '../../types/build'
import { useConfirm } from './useConfirm'
import { CategoryIconImage, CategoryIconPicker } from './CategoryIconPicker'

interface Props {
  categories: Category[]
  mode: 'view' | 'edit'
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: (label: string) => void
  onRename: (id: string, label: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onCopyOut?: (id: string) => void
  onSetIcon: (id: string, icon: CategoryIcon | undefined) => void
}

function tabStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    padding: '5px 14px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border-strong)'}`,
    background: active ? 'rgba(200, 170, 110, 0.18)' : 'var(--bg-panel-raised)',
    color: active ? 'var(--gold-bright)' : 'var(--text-dim)',
    boxShadow: 'none',
  }
}

const actionBtnStyle: CSSProperties = { padding: '5px 12px', fontSize: 13 }

// Sits above the Runes/Items tabs, one level up from both — a category bundles its own rune
// pages and its own item set, so switching category swaps what both of those tabs show.
export function CategoryTabs({
  categories,
  mode,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onDuplicate,
  onCopyOut,
  onSetIcon,
}: Props) {
  const [iconPickerId, setIconPickerId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newLabelDraft, setNewLabelDraft] = useState('')
  const { confirm, dialog: confirmDialog } = useConfirm()

  // Category CRUD (rename/duplicate/delete/add/icon) is edit-mode only, matching how slot rename/delete works — view mode only ever switches between tabs.
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

  const iconPickerCategory = iconPickerId ? categories.find((c) => c.id === iconPickerId) : undefined
  const selected = editable ? categories.find((c) => c.id === activeId) : undefined

  return (
    <div className="panel" style={{ marginBottom: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>Categories</div>
        {editable && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Split this build into variants, e.g. vs AD / vs AP. Each category has its own runes, items and skills.
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {categories.length > 1 && (
          <button type="button" onClick={() => onSelect('all')} style={tabStyle(activeId === 'all')}>
            All
          </button>
        )}
        {categories.map((category) =>
          editable && editingId === category.id ? (
            <input
              key={category.id}
              type="text"
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                else if (e.key === 'Escape') setEditingId(null)
              }}
              style={{ fontSize: 14, fontWeight: 600, padding: '6px 10px', width: 160 }}
            />
          ) : (
            <button key={category.id} type="button" onClick={() => onSelect(category.id)} style={tabStyle(activeId === category.id)}>
              <CategoryIconImage icon={category.icon} size={24} />
              {category.label}
            </button>
          ),
        )}
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
              style={{ fontSize: 14, padding: '6px 10px', width: 160 }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              style={{ minHeight: 36, padding: '5px 14px', fontSize: 14, fontWeight: 600, color: 'var(--gold-bright)', borderStyle: 'dashed', borderColor: 'var(--gold)' }}
            >
              + New category
            </button>
          ))}
      </div>
      {selected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-dim)', marginRight: 4 }}>
            Selected: <strong style={{ color: 'var(--text)' }}>{selected.label}</strong>
          </span>
          <button type="button" onClick={() => setIconPickerId(selected.id)} style={actionBtnStyle}>
            {selected.icon ? 'Change icon' : '+ Icon'}
          </button>
          <button type="button" onClick={() => startRename(selected)} style={actionBtnStyle}>
            Rename
          </button>
          <button type="button" onClick={() => onDuplicate(selected.id)} style={actionBtnStyle}>
            Duplicate
          </button>
          {onCopyOut && (
            <button type="button" onClick={() => onCopyOut(selected.id)} style={actionBtnStyle} title="Copy to another role-variant">
              Copy to…
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              if (await confirm(`Delete category "${selected.label}"? This can't be undone.`)) onDelete(selected.id)
            }}
            style={{ ...actionBtnStyle, color: 'var(--danger)' }}
          >
            Delete
          </button>
        </div>
      )}
      {editable && iconPickerCategory && (
        <CategoryIconPicker
          category={iconPickerCategory}
          onPick={(icon) => onSetIcon(iconPickerCategory.id, icon)}
          onClose={() => setIconPickerId(null)}
        />
      )}
      {confirmDialog}
    </div>
  )
}
