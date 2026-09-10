import { ROLES, ROLE_LABELS } from '../../lib/loadouts'
import type { Role } from '../../types/build'

export type SortKey = 'champion' | 'createdAt' | 'updatedAt'
export type RoleFilter = Role | 'fill'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  favoritesOnly: boolean
  onFavoritesOnlyChange: (value: boolean) => void
  roleFilter: RoleFilter
  onRoleFilterChange: (value: RoleFilter) => void
  sortKey: SortKey
  onSortKeyChange: (value: SortKey) => void
}

export function SearchAndFilterBar({
  search,
  onSearchChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  roleFilter,
  onRoleFilterChange,
  sortKey,
  onSortKeyChange,
}: Props) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
      <input
        type="text"
        placeholder="Search builds..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={favoritesOnly}
          onChange={(e) => onFavoritesOnlyChange(e.target.checked)}
        />
        Favorites only
      </label>
      <select value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value as RoleFilter)}>
        <option value="fill">Fill (All)</option>
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <select value={sortKey} onChange={(e) => onSortKeyChange(e.target.value as SortKey)}>
        <option value="champion">Champion name</option>
        <option value="createdAt">Date created</option>
        <option value="updatedAt">Last updated</option>
      </select>
    </div>
  )
}
