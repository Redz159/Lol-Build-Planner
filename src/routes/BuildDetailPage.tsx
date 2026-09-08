import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCollection } from '../state/CollectionContext'
import { Tabs } from '../components/shared/Tabs'
import { RunePicker } from '../components/runes/RunePicker'
import { RuneSummary } from '../components/runes/RuneSummary'
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
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <Link to="/">&larr; Back to collection</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 20px', flexWrap: 'wrap' }}>
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
                <RunePicker value={build.runes} onChange={(runes) => save({ runes })} />
              ) : (
                <RuneSummary value={build.runes} />
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
