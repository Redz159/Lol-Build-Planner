import type { MouseEvent } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import { itemImageUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  item: DDragonItem
  size?: number
  selected?: boolean
  excluded?: boolean
  badge?: number
  title?: string
  onClick?: (e: MouseEvent) => void
}

export function ItemIcon({ item, size = 44, selected, excluded, badge, title, onClick }: Props) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.name}
      style={{
        position: 'relative',
        border: selected ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
        borderRadius: 8,
        padding: 3,
        opacity: excluded ? 0.3 : 1,
        background: 'var(--bg-panel)',
        boxShadow: selected ? '0 0 0 3px rgba(200, 170, 110, 0.18)' : 'var(--shadow-sm)',
        lineHeight: 0,
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
    </button>
  )

  return (
    <Tooltip
      title={title ?? item.name}
      extra={<div className="tooltip-gold">{item.gold.total}g</div>}
      descriptionHtml={item.description}
    >
      {button}
    </Tooltip>
  )
}
