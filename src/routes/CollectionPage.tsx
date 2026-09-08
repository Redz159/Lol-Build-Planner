import { useMemo, useState } from 'react'
import { useCollection } from '../state/CollectionContext'
import { useGameData } from '../state/GameDataContext'
import { BuildCard } from '../components/collection/BuildCard'
import { SearchAndFilterBar, type SortKey } from '../components/collection/SearchAndFilterBar'
import { NewBuildButton } from '../components/collection/NewBuildButton'
import { ImportBuildButton } from '../components/collection/ImportBuildButton'

export function CollectionPage() {
  const { builds } = useCollection()
  const { loading, error } = useGameData()
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')

  const visibleBuilds = useMemo(() => {
    const filtered = builds.filter((b) => {
      if (favoritesOnly && !b.favorite) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return b.title.toLowerCase().includes(q) || b.champion.name.toLowerCase().includes(q)
    })
    return [...filtered].sort((a, b) => {
      if (sortKey === 'champion') return a.champion.name.localeCompare(b.champion.name)
      if (sortKey === 'createdAt') return b.createdAt.localeCompare(a.createdAt)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [builds, search, favoritesOnly, sortKey])

  if (loading) return <div>Loading game data...</div>
  if (error) return <div>Failed to load game data: {error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28 }}>My collection</h1>
      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <NewBuildButton />
        <ImportBuildButton />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 20 }}>
        {visibleBuilds.map((build) => (
          <BuildCard key={build.id} build={build} />
        ))}
      </div>
    </div>
  )
}
