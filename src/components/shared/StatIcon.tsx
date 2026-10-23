import { statCategoryIconUrl } from '../../lib/statIcons'

export function StatIcon({ id, size = 14 }: { id: string; size?: number }) {
  return <img src={statCategoryIconUrl(id)} alt="" width={size} height={size} style={{ flexShrink: 0 }} />
}
