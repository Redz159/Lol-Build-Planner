import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCollection } from '../state/CollectionContext'
import { Tabs } from '../components/shared/Tabs'
import { RunePagesEditor } from '../components/runes/RunePagesEditor'
import { RunePagesViewer } from '../components/runes/RunePagesViewer'
import { ItemSlotList } from '../components/items/ItemSlotList'
import { exportBuild } from '../lib/exportImport'

export function BuildDetailPage() {
  const { buildId } = useParams<{ buildId: string }>()
  const { builds, updateBuild, deleteBuild, duplicateBuild } = useCollection()
  const navigate = useNavigate()
  const location = useLocation()
  const build = builds.find((b) => b.id === buildId)
  const [mode, setMode] = useState<'view' | 'edit'>(
    (location.state as { startInEdit?: boolean } | null)?.startInEdit ? 'edit' : 'view',
  )
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(build?.title ?? '')

  if (!build) return <div style={{ padding: 24 }}>Build not found. <Link to="/">Back</Link></div>

  const save = (patch: Partial<typeof build>) => {
    updateBuild({ ...build, ...patch, updatedAt: new Date().toISOString() })
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1160, margin: '0 auto' }}>
      <Link to="/">&larr; Back to collection</Link>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          margin: '16px 0 22px',
          paddingBottom: 20,
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {editingTitle ? (
          <>
            <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
            <button
              type="button"
              onClick={() => {
                save({ title: titleDraft.trim() || build.title })
                setEditingTitle(false)
              }}
            >
              Save
            </button>
          </>
        ) : (
          <>
            <h1 style={{ margin: 0, fontSize: 28 }}>
              {build.title} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({build.champion.name})</span>
            </h1>
            {mode === 'edit' && (
              <button type="button" onClick={() => setEditingTitle(true)}>
                Rename
              </button>
            )}
          </>
        )}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setMode(mode === 'view' ? 'edit' : 'view')}
          style={
            mode === 'edit'
              ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' }
              : undefined
          }
        >
          {mode === 'view' ? '✏️ Edit build' : '✓ Done editing'}
        </button>
        <button type="button" onClick={() => duplicateBuild(build.id)}>
          Duplicate
        </button>
        <button type="button" onClick={() => exportBuild(build)}>
          Export
        </button>
        <button
          type="button"
          onClick={() => {
            deleteBuild(build.id)
            navigate('/')
          }}
          style={{ color: 'var(--danger)' }}
        >
          Delete
        </button>
      </div>
      <Tabs
        tabs={[
          {
            key: 'runes',
            label: 'Runes',
            content:
              mode === 'edit' ? (
                <RunePagesEditor pages={build.runePages} onChange={(runePages) => save({ runePages })} />
              ) : (
                <RunePagesViewer pages={build.runePages} />
              ),
          },
          {
            key: 'items',
            label: 'Items',
            content: <ItemSlotList build={build} mode={mode} onChange={(patch) => save(patch)} />,
          },
        ]}
      />
    </div>
  )
}
