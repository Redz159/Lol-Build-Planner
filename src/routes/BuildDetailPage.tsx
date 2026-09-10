import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCollection } from '../state/CollectionContext'
import { useGameData } from '../state/GameDataContext'
import { Tabs } from '../components/shared/Tabs'
import { RunePagesEditor } from '../components/runes/RunePagesEditor'
import { RunePagesViewer } from '../components/runes/RunePagesViewer'
import { ItemsEditor } from '../components/items/ItemsEditor'
import { exportBuild } from '../lib/exportImport'
import { championImageUrl } from '../lib/ddragon'
import type { Build } from '../types/build'

export function BuildDetailPage() {
  const { buildId } = useParams<{ buildId: string }>()
  const { builds, updateBuild, deleteBuild, duplicateBuild } = useCollection()
  const { champions } = useGameData()
  const navigate = useNavigate()
  const location = useLocation()
  const build = builds.find((b) => b.id === buildId)
  const champion = champions.find((c) => c.id === build?.champion.id)
  const [mode, setMode] = useState<'view' | 'edit'>(
    (location.state as { startInEdit?: boolean } | null)?.startInEdit ? 'edit' : 'view',
  )
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(build?.title ?? '')
  const [preEditSnapshot, setPreEditSnapshot] = useState<Build | null>(null)
  const [selectedKeystoneId, setSelectedKeystoneId] = useState<number | null>(null)

  if (!build) return <div style={{ padding: 24 }}>Build not found. <Link to="/">Back</Link></div>

  const save = (patch: Partial<typeof build>) => {
    updateBuild({ ...build, ...patch, updatedAt: new Date().toISOString() })
  }

  const enterEdit = () => {
    setPreEditSnapshot(structuredClone(build))
    setMode('edit')
  }

  const doneEditing = () => {
    setPreEditSnapshot(null)
    setEditingTitle(false)
    setMode('view')
  }

  const cancelEditing = () => {
    if (preEditSnapshot) updateBuild(preEditSnapshot)
    setPreEditSnapshot(null)
    setEditingTitle(false)
    setMode('view')
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
            {champion && (
              <img
                src={championImageUrl(champion.image.full)}
                alt={champion.name}
                width={40}
                height={40}
                style={{ borderRadius: 8, border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' }}
              />
            )}
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
        {mode === 'edit' && (
          <button type="button" onClick={cancelEditing} style={{ color: 'var(--danger)' }}>
            ✕ Cancel
          </button>
        )}
        <button
          type="button"
          onClick={mode === 'view' ? enterEdit : doneEditing}
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
                <RunePagesEditor
                  pages={build.runePages}
                  onChange={(runePages) => save({ runePages })}
                  initialKeystoneId={selectedKeystoneId}
                  onGroupSelect={setSelectedKeystoneId}
                />
              ) : (
                <RunePagesViewer
                  pages={build.runePages}
                  selectedKeystoneId={selectedKeystoneId}
                  onSelectKeystoneId={setSelectedKeystoneId}
                />
              ),
          },
          {
            key: 'items',
            label: 'Items',
            content: <ItemsEditor build={build} mode={mode} onChange={(patch) => save(patch)} />,
          },
        ]}
      />
    </div>
  )
}
