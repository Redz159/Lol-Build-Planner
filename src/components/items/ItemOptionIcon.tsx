import type { ItemOption } from '../../types/items'
import type { DDragonItem } from '../../types/ddragon'
import { itemImageUrl } from '../../lib/ddragon'

interface Props {
  option: ItemOption
  item: DDragonItem | undefined
  selected: boolean
  excluded: boolean
  onClick: () => void
}

export function ItemOptionIcon({ option, item, selected, excluded, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={item?.name ?? option.itemId}
      style={{
        position: 'relative',
        border: selected ? '2px solid red' : '1px solid #444',
        borderRadius: 6,
        padding: 2,
        opacity: excluded ? 0.3 : 1,
        background: 'transparent',
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
            background: 'orange',
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
}
