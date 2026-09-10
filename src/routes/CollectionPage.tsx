import { useMemo, useState } from 'react'
import { useCollection } from '../state/CollectionContext'
import { useGameData } from '../state/GameDataContext'
import { BuildCard } from '../components/collection/BuildCard'
import { SearchAndFilterBar, type RoleFilter, type SortKey } from '../components/collection/SearchAndFilterBar'
import { NewBuildButton } from '../components/collection/NewBuildButton'
import { ImportBuildButton } from '../components/collection/ImportBuildButton'
import { buildRoles } from '../lib/loadouts'

export function CollectionPage() {
  const { builds } = useCollection()
  const { loading, error } = useGameData()
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('fill')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')

  const visibleBuilds = useMemo(() => {
    const filtered = builds.filter((b) => {
      if (favoritesOnly && !b.favorite) return false
      if (roleFilter !== 'fill' && !buildRoles(b).includes(roleFilter)) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return b.title.toLowerCase().includes(q) || b.champion.name.toLowerCase().includes(q)
    })
    return [...filtered].sort((a, b) => {
      if (sortKey === 'champion') return a.champion.name.localeCompare(b.champion.name)
      if (sortKey === 'createdAt') return b.createdAt.localeCompare(a.createdAt)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [builds, search, favoritesOnly, roleFilter, sortKey])

  if (loading)
    return <div style={{ padding: 32, color: 'var(--text-dim)' }}>Loading game data...</div>
  if (error)
    return (
      <div style={{ padding: 32, color: 'var(--danger)' }}>Failed to load game data: {error}</div>
    )

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1160, margin: '0 auto' }}>
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>My collection</h1>
      <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 22 }}>
        {builds.length} {builds.length === 1 ? 'build' : 'builds'} saved
      </div>
      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <NewBuildButton />
        <ImportBuildButton />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 26 }}>
        {visibleBuilds.map((build) => (
          <BuildCard key={build.id} build={build} />
        ))}
      </div>
    </div>
  )
}
