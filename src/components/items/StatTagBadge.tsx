import type { StatCategory } from '../../lib/itemStatTags'
import { StatIcon } from '../shared/StatIcon'
import { Tooltip } from '../shared/Tooltip'

export function StatTagBadge({ category }: { category: StatCategory }) {
  return (
    <Tooltip title={category.label}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '1px 5px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          color: category.color,
          background: `${category.color}22`,
          border: `1px solid ${category.color}55`,
        }}
      >
        <StatIcon id={category.id} />
        {category.short}
      </span>
    </Tooltip>
  )
}
