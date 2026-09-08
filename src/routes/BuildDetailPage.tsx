import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCollection } from '../state/CollectionContext'
import { Tabs } from '../components/shared/Tabs'
import { RunePicker } from '../components/runes/RunePicker'
import { ItemSlotList } from '../components/items/ItemSlotList'
import { exportBuild } from '../lib/exportImport'

export function BuildDetailPage() {
  const { buildId } = useParams<{ buildId: string }>()
  const { builds, updateBuild, deleteBuild, duplicateBuild } = useCollection()
  const navigate = useNavigate()
  const build = builds.find((b) => b.id === buildId)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(build?.title ?? '')

  if (!build) return <div style={{ padding: 24 }}>Build not found. <Link to="/">Back</Link></div>

  const save = (patch: Partial<typeof build>) => {
    updateBuild({ ...build, ...patch, updatedAt: new Date().toISOString() })
  }

  return (
    <div style={{ padding: 24 }}>
      <Link to="/">&larr; Back to collection</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
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
            <h1 style={{ margin: 0 }}>
              {build.title} ({build.champion.name})
            </h1>
            <button type="button" onClick={() => setEditingTitle(true)} title="Edit title">
              ✏️
            </button>
            <button
              type="button"
              onClick={() => duplicateBuild(build.id)}
              title="Duplicate build"
            >
              📄
            </button>
            <button type="button" onClick={() => exportBuild(build)} title="Export as JSON">
              Export
            </button>
            <button
              type="button"
              onClick={() => {
                deleteBuild(build.id)
                navigate('/')
              }}
              title="Delete build"
            >
              🗑
            </button>
          </>
        )}
      </div>
      <Tabs
        tabs={[
          {
            key: 'runes',
            label: 'Runes',
            content: (
              <RunePicker value={build.runes} onChange={(runes) => save({ runes })} />
            ),
          },
          {
            key: 'items',
            label: 'Items',
            content: (
              <ItemSlotList
                build={build}
                onChange={(patch) => save(patch)}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
