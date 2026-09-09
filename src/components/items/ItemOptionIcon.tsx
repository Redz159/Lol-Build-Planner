import type { ItemOption } from '../../types/items'
import type { DDragonItem } from '../../types/ddragon'
import { itemImageUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  option: ItemOption
  item: DDragonItem | undefined
  selected: boolean
  excluded: boolean
  onClick: () => void
}

export function ItemOptionIcon({ option, item, selected, excluded, onClick }: Props) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={item?.name ?? option.itemId}
      style={{
        position: 'relative',
        border: selected ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
        borderRadius: 8,
        padding: 3,
        opacity: excluded ? 0.3 : 1,
        background: 'var(--bg-panel)',
        boxShadow: selected ? '0 0 0 3px rgba(200, 170, 110, 0.18)' : 'var(--shadow-sm)',
      }}
    >
      {item && (
        <img
          src={itemImageUrl(item.image.full)}
          alt={item.name}
          width={44}
          height={44}
          style={{ borderRadius: 4, display: 'block' }}
        />
      )}
      {option.situational && (
        <span
          style={{
            position: 'absolute',
            top: -5,
            right: -5,
            fontSize: 10,
            background: '#e0a83d',
            color: '#1a1408',
            fontWeight: 700,
            borderRadius: '50%',
            width: 15,
            height: 15,
            lineHeight: '15px',
            boxShadow: 'var(--shadow-sm)',
          }}
          title="Situational"
        >
          !
        </span>
      )}
    </button>
  )

  if (!item) return button

  return (
    <Tooltip
      title={item.name}
      extra={<div className="tooltip-gold">{item.gold.total}g</div>}
      descriptionHtml={item.description}
    >
      {button}
    </Tooltip>
  )
}
