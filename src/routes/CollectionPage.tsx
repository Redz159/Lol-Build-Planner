import { useMemo, useState } from 'react'
import { useCollection } from '../state/CollectionContext'
import { useGameData } from '../state/GameDataContext'
import { BuildCard } from '../components/collection/BuildCard'
import { SearchAndFilterBar, type RoleFilter, type SortKey } from '../components/collection/SearchAndFilterBar'
import { NewBuildButton } from '../components/collection/NewBuildButton'
import { ImportBuildButton } from '../components/collection/ImportBuildButton'
import { RiotImportButton } from '../components/collection/RiotImportButton'
import { activeButtonStyle, primaryButtonStyle, toolbarPanelStyle, toolbarPanelTitleStyle } from '../components/collection/toolbarStyles'
import { buildRoles } from '../lib/loadouts'
import { exportBuild } from '../lib/exportImport'

// Browsers can choke on a burst of simultaneous downloads (some show a "this site is downloading
// multiple files" block), so builds are downloaded one at a time with a small gap rather than
// all at once.
const MASS_DOWNLOAD_GAP_MS = 150

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

type ToolbarPanel = 'new' | 'import' | 'riot' | 'export'

export function CollectionPage() {
  const { builds } = useCollection()
  const { loading, error } = useGameData()
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('fill')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  // Only one toolbar panel is open at a time; opening one closes the others. Panels render into
  // panelSlot, the row below the toolbar, so they never sit among the toolbar buttons.
  const [openPanel, setOpenPanel] = useState<ToolbarPanel | null>(null)
  const [panelSlot, setPanelSlot] = useState<HTMLDivElement | null>(null)
  // Bulk-export selection — cleared whenever export mode is left so re-entering starts fresh
  // rather than remembering a stale pick.
  const exportMode = openPanel === 'export'
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  const showPanel = (panel: ToolbarPanel | null) => {
    if (exportMode && panel !== 'export') setSelectedIds(new Set())
    setOpenPanel(panel)
  }

  // Closing a panel only closes it if it's the one showing, so a panel that closes itself late
  // (import finishing its queue) can't close whatever replaced it.
  const panelOpenChange = (panel: ToolbarPanel) => (open: boolean) => {
    if (open) showPanel(panel)
    else if (openPanel === panel) showPanel(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = visibleBuilds.length > 0 && visibleBuilds.every((b) => selectedIds.has(b.id))
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(visibleBuilds.map((b) => b.id)))
  }

  const downloadSelected = async () => {
    for (const build of visibleBuilds) {
      if (!selectedIds.has(build.id)) continue
      exportBuild(build)
      await sleep(MASS_DOWNLOAD_GAP_MS)
    }
  }

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
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <NewBuildButton open={openPanel === 'new'} onOpenChange={panelOpenChange('new')} panelSlot={panelSlot} />
        <ImportBuildButton open={openPanel === 'import'} onOpenChange={panelOpenChange('import')} panelSlot={panelSlot} />
        {import.meta.env.DEV && (
          <RiotImportButton open={openPanel === 'riot'} onOpenChange={panelOpenChange('riot')} panelSlot={panelSlot} />
        )}
        <button
          type="button"
          aria-expanded={exportMode}
          onClick={() => showPanel(exportMode ? null : 'export')}
          style={exportMode ? activeButtonStyle : undefined}
        >
          {exportMode ? 'Cancel export' : 'Export builds…'}
        </button>
      </div>
      <div style={{ marginTop: openPanel ? 12 : 0 }}>
        <div ref={setPanelSlot} />
        {exportMode && (
          <div className="panel" style={{ ...toolbarPanelStyle, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={toolbarPanelTitleStyle}>Export builds</div>
            <button type="button" onClick={toggleSelectAll} disabled={visibleBuilds.length === 0}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => void downloadSelected()}
              style={primaryButtonStyle}
            >
              Download ({selectedIds.size})
            </button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 26 }}>
        {visibleBuilds.map((build) => (
          <BuildCard
            key={build.id}
            build={build}
            selectionMode={exportMode}
            selected={selectedIds.has(build.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>
    </div>
  )
}
