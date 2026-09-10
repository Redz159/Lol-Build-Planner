import { FILL_ICON_URL, ROLES } from '../../lib/loadouts'
import { RoleIcon } from '../shared/RoleIcon'
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
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onRoleFilterChange('fill')}
          title="Fill (All)"
          style={{
            display: 'flex',
            padding: '5px 7px',
            ...(roleFilter === 'fill' ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' } : {}),
          }}
        >
          <img src={FILL_ICON_URL} alt="Fill (All)" width={16} height={16} />
        </button>
        {ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onRoleFilterChange(role)}
            style={{
              display: 'flex',
              padding: '5px 7px',
              ...(roleFilter === role ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' } : {}),
            }}
          >
            <RoleIcon role={role} size={16} />
          </button>
        ))}
      </div>
      <select value={sortKey} onChange={(e) => onSortKeyChange(e.target.value as SortKey)}>
        <option value="champion">Champion name</option>
        <option value="createdAt">Date created</option>
        <option value="updatedAt">Last updated</option>
      </select>
    </div>
  )
}
