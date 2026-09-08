import { useMemo, useState } from 'react'
import type { Build } from '../../types/build'
import type { ItemSlot } from '../../types/items'
import type { Tag } from '../../types/tags'
import { newId } from '../../lib/id'
import { PREMADE_TAGS } from '../../data/premadeTags'
import { useGameData } from '../../state/GameDataContext'
import { ItemSlotRow } from './ItemSlotRow'
import { TagPanel } from './TagPanel'

interface Props {
  build: Build
  onChange: (patch: Partial<Build>) => void
}

export function ItemSlotList({ build, onChange }: Props) {
  const { items } = useGameData()
  const [preview, setPreview] = useState<Record<string, string>>({})

  const allTags: Tag[] = [...PREMADE_TAGS, ...build.customTags]

  const allOptions = useMemo(() => build.itemSlots.flatMap((s) => s.options), [build.itemSlots])

  const excludedIds = useMemo(() => {
    const set = new Set<string>()
    for (const optionId of Object.values(preview)) {
      const opt = allOptions.find((o) => o.id === optionId)
      opt?.excludes.forEach((e) => set.add(e))
    }
    return set
  }, [preview, allOptions])

  const updateSlots = (slots: ItemSlot[]) => onChange({ itemSlots: slots })

  const addSlot = () => {
    const slot: ItemSlot = {
      id: newId(),
      label: `Slot ${build.itemSlots.length + 1}`,
      options: [],
    }
    updateSlots([...build.itemSlots, slot])
  }

  const updateSlot = (slotId: string, patch: Partial<ItemSlot>) => {
    updateSlots(build.itemSlots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)))
  }

  const removeSlot = (slotId: string) => {
    updateSlots(build.itemSlots.filter((s) => s.id !== slotId))
    setPreview((p) => {
      if (!(slotId in p)) return p
      const rest = { ...p }
      delete rest[slotId]
      return rest
    })
  }

  const addCustomTag = (label: string): string => {
    const tag: Tag = { id: `custom:${newId()}`, label, origin: 'custom' }
    onChange({ customTags: [...build.customTags, tag] })
    return tag.id
  }

  const clickOption = (slotId: string, optionId: string) => {
    setPreview((p) => {
      if (p[slotId] === optionId) {
        const rest = { ...p }
        delete rest[slotId]
        return rest
      }
      return { ...p, [slotId]: optionId }
    })
  }

  return (
    <div>
      <TagPanel tags={allTags} />
      {build.itemSlots.map((slot) => (
        <ItemSlotRow
          key={slot.id}
          slot={slot}
          allSlots={build.itemSlots}
          items={items}
          allTags={allTags}
          previewSelectedId={preview[slot.id]}
          excludedIds={excludedIds}
          onSlotChange={(patch) => updateSlot(slot.id, patch)}
          onRemoveSlot={() => removeSlot(slot.id)}
          onAddCustomTag={addCustomTag}
          onClickOption={(optionId) => clickOption(slot.id, optionId)}
        />
      ))}
      <button type="button" onClick={addSlot}>
        + Add slot
      </button>
    </div>
  )
}
