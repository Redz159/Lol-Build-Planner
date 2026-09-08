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
        borderRadius: 6,
        padding: 2,
        opacity: excluded ? 0.3 : 1,
        background: 'var(--bg-panel)',
      }}
    >
      {item && <img src={itemImageUrl(item.image.full)} alt={item.name} width={36} height={36} />}
      {option.situational && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            fontSize: 10,
            background: '#e0a83d',
            color: '#1a1408',
            fontWeight: 700,
            borderRadius: '50%',
            width: 14,
            height: 14,
            lineHeight: '14px',
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
