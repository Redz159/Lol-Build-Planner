import type { ItemOption, ItemSlot } from '../../types/items'
import type { DDragonItem } from '../../types/ddragon'

interface Props {
  option: ItemOption
  slots: ItemSlot[]
  items: DDragonItem[]
  onChange: (excludes: string[]) => void
}

export function ExclusionEditor({ option, slots, items, onChange }: Props) {
  const candidates = slots.flatMap((slot) =>
    slot.options
      .filter((o) => o.id !== option.id)
      .map((o) => ({ slotLabel: slot.label, option: o })),
  )

  if (candidates.length === 0) return null

  const toggle = (optionId: string) => {
    const next = option.excludes.includes(optionId)
      ? option.excludes.filter((id) => id !== optionId)
      : [...option.excludes, optionId]
    onChange(next)
  }

  return (
    <details style={{ fontSize: 12 }}>
      <summary>Excludes ({option.excludes.length})</summary>
      {candidates.map(({ slotLabel, option: other }) => {
        const item = items.find((i) => i.id === other.itemId)
        return (
          <label key={other.id} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={option.excludes.includes(other.id)}
              onChange={() => toggle(other.id)}
            />
            {slotLabel}: {item?.name ?? other.itemId}
          </label>
        )
      })}
    </details>
  )
}
