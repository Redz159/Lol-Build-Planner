import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCollection } from '../state/CollectionContext'
import { useGameData } from '../state/GameDataContext'
import { Tabs } from '../components/shared/Tabs'
import { RunePagesEditor } from '../components/runes/RunePagesEditor'
import { RunePagesViewer } from '../components/runes/RunePagesViewer'
import { ItemsEditor } from '../components/items/ItemsEditor'
import { exportBuild } from '../lib/exportImport'
import { championImageUrl } from '../lib/ddragon'
import {
  FILL_ICON_URL,
  ROLES,
  ROLE_LABELS,
  assignRole,
  buildRoles,
  loadoutLabel,
  removeLoadout,
  roleOwnerLoadoutId,
  splitLoadout,
} from '../lib/loadouts'
import { RoleIcon } from '../components/shared/RoleIcon'
import type { Build, Loadout, Role } from '../types/build'

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
  const [activeLoadoutId, setActiveLoadoutId] = useState<string | undefined>(build?.loadouts[0]?.id)

  useEffect(() => {
    if (build && !build.loadouts.some((l) => l.id === activeLoadoutId)) {
      setActiveLoadoutId(build.loadouts[0]?.id)
    }
  }, [build, activeLoadoutId])

  if (!build) return <div style={{ padding: 24 }}>Build not found. <Link to="/">Back</Link></div>

  const activeLoadout = build.loadouts.find((l) => l.id === activeLoadoutId) ?? build.loadouts[0]

  const save = (patch: Partial<typeof build>) => {
    updateBuild({ ...build, ...patch, updatedAt: new Date().toISOString() })
  }

  const saveLoadout = (patch: Partial<Loadout>) => {
    save({ loadouts: build.loadouts.map((l) => (l.id === activeLoadout.id ? { ...l, ...patch } : l)) })
  }

  const toggleRole = (role: Role, checked: boolean) => {
    const next = assignRole(build, activeLoadout.id, role, checked)
    save(next)
  }

  const addVariant = () => {
    const { build: next, newLoadoutId } = splitLoadout(build, activeLoadout.id)
    save(next)
    setActiveLoadoutId(newLoadoutId)
  }

  const deleteVariant = () => {
    save(removeLoadout(build, activeLoadout.id))
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {buildRoles(build).length === 0 ? (
                <img src={FILL_ICON_URL} alt="Fill" title="Fill" width={18} height={18} />
              ) : (
                buildRoles(build).map((role) => <RoleIcon key={role} role={role} size={18} />)
              )}
            </div>
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

      {build.loadouts.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {build.loadouts.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setActiveLoadoutId(l.id)}
              title={loadoutLabel(l)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                ...(l.id === activeLoadout.id ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' } : {}),
              }}
            >
              {l.roles.length === 0 ? (
                <img src={FILL_ICON_URL} alt="Fill" width={16} height={16} />
              ) : (
                l.roles.map((role) => <RoleIcon key={role} role={role} size={16} />)
              )}
            </button>
          ))}
          {mode === 'edit' && (
            <button type="button" onClick={deleteVariant} style={{ color: 'var(--danger)' }}>
              Delete variant
            </button>
          )}
        </div>
      )}

      {mode === 'edit' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--text-dim)',
            flexWrap: 'wrap',
          }}
        >
          <span>Applies to:</span>
          {ROLES.map((role) => {
            const ownerId = roleOwnerLoadoutId(build, role)
            const takenElsewhere = ownerId !== undefined && ownerId !== activeLoadout.id
            return (
              <label
                key={role}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: takenElsewhere ? 'not-allowed' : undefined,
                }}
                title={takenElsewhere ? `${ROLE_LABELS[role]} is already assigned to another variant` : undefined}
              >
                <input
                  type="checkbox"
                  checked={activeLoadout.roles.includes(role)}
                  disabled={takenElsewhere}
                  onChange={(e) => toggleRole(role, e.target.checked)}
                />
                <RoleIcon role={role} size={18} dim={takenElsewhere} />
              </label>
            )
          })}
          <button type="button" onClick={addVariant} style={{ marginLeft: 'auto' }}>
            + New variant
          </button>
        </div>
      )}

      <Tabs
        tabs={[
          {
            key: 'runes',
            label: 'Runes',
            content:
              mode === 'edit' ? (
                <RunePagesEditor
                  key={activeLoadout.id}
                  pages={activeLoadout.runePages}
                  onChange={(runePages) => saveLoadout({ runePages })}
                  initialKeystoneId={selectedKeystoneId}
                  onGroupSelect={setSelectedKeystoneId}
                />
              ) : (
                <RunePagesViewer
                  key={activeLoadout.id}
                  pages={activeLoadout.runePages}
                  selectedKeystoneId={selectedKeystoneId}
                  onSelectKeystoneId={setSelectedKeystoneId}
                />
              ),
          },
          {
            key: 'items',
            label: 'Items',
            content: (
              <ItemsEditor
                key={activeLoadout.id}
                loadout={activeLoadout}
                mode={mode}
                onChange={(patch) => saveLoadout(patch)}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
