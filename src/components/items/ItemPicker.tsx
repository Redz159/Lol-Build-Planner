import { useId, useState } from 'react'
import type { DDragonItem } from '../../types/ddragon'

interface Props {
  items: DDragonItem[]
  onSelect: (itemId: string) => void
}

export function ItemPicker({ items, onSelect }: Props) {
  const listId = useId()
  const [text, setText] = useState('')

  const confirm = () => {
    const match = items.find((i) => i.name.toLowerCase() === text.trim().toLowerCase())
    if (match) {
      onSelect(match.id)
      setText('')
    }
  }

  return (
    <span>
      <input
        list={listId}
        value={text}
        placeholder="Add item..."
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && confirm()}
        onBlur={confirm}
        style={{ width: 140 }}
      />
      <datalist id={listId}>
        {items.map((item) => (
          <option key={item.id} value={item.name} />
        ))}
      </datalist>
    </span>
  )
}
