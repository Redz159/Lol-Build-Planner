import type { DragEvent, MouseEvent } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import { itemImageUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

// Hover relation ring: gold marks other placements of the same item, red a mutual exclusion,
// green an item the hovered one requires, blue an item that requires the hovered one.
export type ItemRelationOutline = 'gold' | 'red' | 'green' | 'blue'

const OUTLINE_COLORS: Record<ItemRelationOutline, string> = {
  gold: 'var(--gold)',
  red: 'var(--danger)',
  green: 'var(--success)',
  blue: 'var(--accent)',
}

interface Props {
  item: DDragonItem
  size?: number
  selected?: boolean
  excluded?: boolean
  outline?: ItemRelationOutline
  badge?: number
  title?: string
  note?: string
  draggable?: boolean
  onDragStart?: (e: DragEvent<HTMLButtonElement>) => void
  onDragEnd?: (e: DragEvent<HTMLButtonElement>) => void
  onClick?: (e: MouseEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function ItemIcon({
  item,
  size = 44,
  selected,
  excluded,
  outline,
  badge,
  title,
  note,
  draggable,
  onDragStart,
  onDragEnd,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const rings = [
    selected ? '0 0 0 3px rgba(200, 170, 110, 0.18)' : null,
    outline ? `0 0 0 2px ${OUTLINE_COLORS[outline]}` : null,
  ].filter(Boolean)

  const button = (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={item.name}
      style={{
        position: 'relative',
        border: selected ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
        borderRadius: 8,
        padding: 3,
        opacity: excluded ? 0.3 : 1,
        background: 'var(--bg-panel)',
        boxShadow: rings.length > 0 ? rings.join(', ') : 'var(--shadow-sm)',
        lineHeight: 0,
        cursor: draggable ? 'grab' : undefined,
      }}
    >
      <img
        src={itemImageUrl(item.image.full)}
        alt={item.name}
        width={size}
        height={size}
        style={{ borderRadius: 4, display: 'block' }}
      />
      {!!badge && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            fontSize: 10,
            background: 'var(--accent)',
            color: '#0a0e14',
            fontWeight: 700,
            borderRadius: '50%',
            width: 16,
            height: 16,
            lineHeight: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {badge}
        </span>
      )}
      {!!note && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -6,
            right: -6,
            fontSize: 10,
            fontWeight: 700,
            background: 'var(--gold)',
            color: '#0a0e14',
            borderRadius: '50%',
            width: 15,
            height: 15,
            lineHeight: '15px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          ?
        </span>
      )}
    </button>
  )

  return (
    <Tooltip
      title={title ?? item.name}
      extra={<div className="tooltip-gold">{item.gold.total}g</div>}
      descriptionHtml={item.description}
      note={note}
    >
      {button}
    </Tooltip>
  )
}
