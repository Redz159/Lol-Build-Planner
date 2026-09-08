export type SortKey = 'champion' | 'createdAt' | 'updatedAt'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  favoritesOnly: boolean
  onFavoritesOnlyChange: (value: boolean) => void
  sortKey: SortKey
  onSortKeyChange: (value: SortKey) => void
}

export function SearchAndFilterBar({
  search,
  onSearchChange,
  favoritesOnly,
  onFavoritesOnlyChange,
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
      <select value={sortKey} onChange={(e) => onSortKeyChange(e.target.value as SortKey)}>
        <option value="champion">Champion name</option>
        <option value="createdAt">Date created</option>
        <option value="updatedAt">Last updated</option>
      </select>
    </div>
  )
}
