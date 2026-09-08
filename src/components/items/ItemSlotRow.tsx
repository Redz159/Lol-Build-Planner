import type { ItemSlot, ItemOption } from '../../types/items'
import type { Tag } from '../../types/tags'
import type { DDragonItem } from '../../types/ddragon'
import { newId } from '../../lib/id'
import { ItemOptionIcon } from './ItemOptionIcon'
import { ItemPicker } from './ItemPicker'
import { ExclusionEditor } from './ExclusionEditor'

interface Props {
  slot: ItemSlot
  allSlots: ItemSlot[]
  items: DDragonItem[]
  allTags: Tag[]
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

  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          value={slot.label}
          onChange={(e) => onSlotChange({ label: e.target.value })}
          style={{ width: 100 }}
        />
        <button type="button" onClick={onRemoveSlot}>
          Remove slot
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        {slot.options.map((option) => {
          const item = items.find((i) => i.id === option.itemId)
          return (
            <div key={option.id} style={{ textAlign: 'center', width: 130 }}>
              <ItemOptionIcon
                option={option}
                item={item}
                selected={previewSelectedId === option.id}
                excluded={excludedIds.has(option.id)}
                onClick={() => onClickOption(option.id)}
              />
              <div style={{ fontSize: 11 }}>
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
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 8 }}>
        <ItemPicker items={items} onSelect={addOption} />
      </div>
    </div>
  )
}
