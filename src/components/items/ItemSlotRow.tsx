import type { ItemSlot, ItemOption } from '../../types/items'
import type { Tag } from '../../types/tags'
import type { DDragonItem } from '../../types/ddragon'
import { newId } from '../../lib/id'
import { getAutoStatTags } from '../../lib/itemStatTags'
import { ItemOptionIcon } from './ItemOptionIcon'
import { ItemPicker } from './ItemPicker'
import { ExclusionEditor } from './ExclusionEditor'
import { StatTagBadge } from './StatTagBadge'

interface Props {
  slot: ItemSlot
  allSlots: ItemSlot[]
  items: DDragonItem[]
  allTags: Tag[]
  mode: 'view' | 'edit'
  previewSelectedId: string | undefined
  excludedIds: Set<string>
  onSlotChange: (patch: Partial<ItemSlot>) => void
  onRemoveSlot: () => void
  onAddCustomTag: (label: string) => string
  onClickOption: (optionId: string) => void
}

export function ItemSlotRow({
  slot,
  allSlots,
  items,
  allTags,
  mode,
  previewSelectedId,
  excludedIds,
  onSlotChange,
  onRemoveSlot,
  onAddCustomTag,
  onClickOption,
}: Props) {
  const updateOption = (optionId: string, patch: Partial<ItemOption>) => {
    onSlotChange({
      options: slot.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
    })
  }

  const removeOption = (optionId: string) => {
    onSlotChange({ options: slot.options.filter((o) => o.id !== optionId) })
  }

  const addOption = (itemId: string) => {
    const option: ItemOption = {
      id: newId(),
      itemId,
      situational: false,
      tagIds: [],
      excludes: [],
    }
    onSlotChange({ options: [...slot.options, option] })
  }

  const toggleTag = (option: ItemOption, tagId: string) => {
    const next = option.tagIds.includes(tagId)
      ? option.tagIds.filter((id) => id !== tagId)
      : [...option.tagIds, tagId]
    updateOption(option.id, { tagIds: next })
  }

  if (mode === 'view' && slot.options.length === 0) return null

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        background: 'var(--bg-panel)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {mode === 'edit' ? (
          <>
            <input
              value={slot.label}
              onChange={(e) => onSlotChange({ label: e.target.value })}
              style={{ width: 100 }}
            />
            <button type="button" onClick={onRemoveSlot}>
              Remove slot
            </button>
          </>
        ) : (
          <div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {slot.label}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {slot.options.map((option) => {
          const item = items.find((i) => i.id === option.itemId)
          const autoTags = item ? getAutoStatTags(item.tags) : []
          const assignedTags = allTags.filter((t) => option.tagIds.includes(t.id))
          return (
            <div key={option.id} style={{ textAlign: 'center', width: 130 }}>
              <ItemOptionIcon
                option={option}
                item={item}
                selected={previewSelectedId === option.id}
                excluded={excludedIds.has(option.id)}
                onClick={() => onClickOption(option.id)}
              />
              {autoTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', marginTop: 5 }}>
                  {autoTags.map((cat) => (
                    <StatTagBadge key={cat.id} category={cat} />
                  ))}
                </div>
              )}

              {mode === 'edit' ? (
                <>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={option.situational}
                        onChange={(e) => updateOption(option.id, { situational: e.target.checked })}
                      />
                      Situational
                    </label>
                  </div>
                  <details style={{ fontSize: 11, textAlign: 'left' }}>
                    <summary>Tags ({option.tagIds.length})</summary>
                    {allTags.map((tag) => (
                      <label key={tag.id} style={{ display: 'block' }}>
                        <input
                          type="checkbox"
                          checked={option.tagIds.includes(tag.id)}
                          onChange={() => toggleTag(option, tag.id)}
                        />
                        {tag.label}
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const label = prompt('Custom tag name:')
                        if (!label) return
                        const tagId = onAddCustomTag(label)
                        toggleTag(option, tagId)
                      }}
                    >
                      + custom tag
                    </button>
                  </details>
                  <ExclusionEditor
                    option={option}
                    slots={allSlots}
                    items={items}
                    onChange={(excludes) => updateOption(option.id, { excludes })}
                  />
                  <button type="button" onClick={() => removeOption(option.id)}>
                    Remove
                  </button>
                </>
              ) : (
                assignedTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', marginTop: 4 }}>
                    {assignedTags.map((tag) => (
                      <span
                        key={tag.id}
                        style={{
                          fontSize: 10,
                          padding: '1px 5px',
                          borderRadius: 4,
                          border: '1px solid var(--border-strong)',
                          color: 'var(--text-dim)',
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>

      {mode === 'edit' && (
        <div style={{ marginTop: 10 }}>
          <ItemPicker items={items} onSelect={addOption} />
        </div>
      )}
    </div>
  )
}
