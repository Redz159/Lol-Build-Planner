import type { Build, Loadout, Role } from '../../types/build'
import type { DDragonChampion } from '../../types/ddragon'
import { championImageUrl } from '../../lib/ddragon'
import { exportBuild } from '../../lib/exportImport'
import { FILL_ICON_URL, ROLES, ROLE_LABELS, loadoutLabel, roleOwnerLoadoutId } from '../../lib/loadouts'
import { RoleIcon } from '../shared/RoleIcon'

interface Props {
  build: Build
  champion: DDragonChampion | undefined
  activeLoadout: Loadout
  mode: 'view' | 'edit'
  editingTitle: boolean
  titleDraft: string
  onTitleDraftChange: (title: string) => void
  onSaveTitle: () => void
  onStartRename: () => void
  onEnterEdit: () => void
  onDoneEditing: () => void
  onCancelEditing: () => void
  onDuplicate: () => void
  onDelete: () => void
  onSelectLoadout: (loadoutId: string) => void
  onDeleteVariant: () => void
  onToggleRole: (role: Role, checked: boolean) => void
  onAddVariant: () => void
}

// The build page's top section: title bar with the build-level actions, the role-variant
// switcher, and (in edit mode) the active variant's role checkboxes.
export function BuildHeader({
  build,
  champion,
  activeLoadout,
  mode,
  editingTitle,
  titleDraft,
  onTitleDraftChange,
  onSaveTitle,
  onStartRename,
  onEnterEdit,
  onDoneEditing,
  onCancelEditing,
  onDuplicate,
  onDelete,
  onSelectLoadout,
  onDeleteVariant,
  onToggleRole,
  onAddVariant,
}: Props) {
  return (
    <>
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
            <input type="text" value={titleDraft} onChange={(e) => onTitleDraftChange(e.target.value)} />
            <button type="button" onClick={onSaveTitle}>
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
              {build.loadouts.map((l, i) => (
                <span key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <span style={{ color: 'var(--gold)' }}>/</span>}
                  {l.roles.length === 0 ? (
                    <img src={FILL_ICON_URL} alt="Fill" title="Fill" width={18} height={18} />
                  ) : (
                    l.roles.map((role) => <RoleIcon key={role} role={role} size={18} />)
                  )}
                </span>
              ))}
            </div>
            {mode === 'edit' && (
              <button type="button" onClick={onStartRename}>
                Rename
              </button>
            )}
          </>
        )}
        <div style={{ flex: 1 }} />
        {mode === 'edit' && (
          <button type="button" onClick={onCancelEditing} style={{ color: 'var(--danger)' }}>
            ✕ Cancel
          </button>
        )}
        <button
          type="button"
          onClick={mode === 'view' ? onEnterEdit : onDoneEditing}
          style={
            mode === 'edit'
              ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' }
              : undefined
          }
        >
          {mode === 'view' ? '✏️ Edit build' : '✓ Done editing'}
        </button>
        <button type="button" onClick={onDuplicate}>
          Duplicate
        </button>
        <button type="button" onClick={() => exportBuild(build)}>
          Export
        </button>
        <button type="button" onClick={onDelete} style={{ color: 'var(--danger)' }}>
          Delete
        </button>
      </div>

      {build.loadouts.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {build.loadouts.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelectLoadout(l.id)}
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
            <button type="button" onClick={onDeleteVariant} style={{ color: 'var(--danger)' }}>
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
                  onChange={(e) => onToggleRole(role, e.target.checked)}
                />
                <RoleIcon role={role} size={18} dim={takenElsewhere} />
              </label>
            )
          })}
          <button type="button" onClick={onAddVariant} style={{ marginLeft: 'auto' }}>
            + New variant
          </button>
        </div>
      )}
    </>
  )
}
