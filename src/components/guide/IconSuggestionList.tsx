import { forwardRef, useImperativeHandle, useState } from 'react'
import type { IconEntry } from '../../lib/guideIcons'

export interface ListProps {
  items: IconEntry[]
  command: (entry: IconEntry) => void
}

export interface ListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean
}

// The dropdown under the caret while typing ":vol". Enter/Tab picks the highlighted (by default
// the top) entry; the keys are forwarded here from the editor, which keeps focus.
export const IconSuggestionList = forwardRef<ListHandle, ListProps>(function IconSuggestionList({ items, command }, ref) {
  const [highlight, setHighlight] = useState(0)
  const [prevItems, setPrevItems] = useState(items)
  if (prevItems !== items) {
    setPrevItems(items)
    setHighlight(0)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false
      if (event.key === 'ArrowDown') {
        setHighlight((h) => (h + 1) % items.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        setHighlight((h) => (h - 1 + items.length) % items.length)
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        command(items[highlight] ?? items[0])
        return true
      }
      return false
    },
  }))

  if (items.length === 0) return null
  return (
    <div className="guide-suggestions" role="listbox">
      {items.map((entry, i) => (
        <div
          key={entry.ref}
          role="option"
          aria-selected={i === highlight}
          className={i === highlight ? 'guide-suggestion active' : 'guide-suggestion'}
          onMouseDown={(e) => {
            e.preventDefault()
            command(entry)
          }}
          onMouseEnter={() => setHighlight(i)}
        >
          <img src={entry.iconUrl} alt="" width={22} height={22} />
          <span>{entry.name}</span>
          <span className="guide-suggestion-subtitle">{entry.subtitle}</span>
        </div>
      ))}
    </div>
  )
})
