import { Link } from 'react-router-dom'
import type { Build } from '../../types/build'
import { useGameData } from '../../state/GameDataContext'
import { useCollection } from '../../state/CollectionContext'
import { championImageUrl } from '../../lib/ddragon'
import { FILL_ICON_URL, buildRoles } from '../../lib/loadouts'
import { RoleIcon } from '../shared/RoleIcon'
import { useConfirm } from '../shared/useConfirm'

interface Props {
  build: Build
  // Bulk-export mode from the collection page: clicking the card toggles selection instead of
  // navigating away, and the favorite/delete row is swapped for a checkbox — both would just be
  // clutter while picking builds to download.
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export function BuildCard({ build, selectionMode, selected, onToggleSelect }: Props) {
  const { champions } = useGameData()
  const { toggleFavorite, deleteBuild } = useCollection()
  const { confirm, dialog } = useConfirm()
  const champion = champions.find((c) => c.id === build.champion.id)
  const roles = buildRoles(build)

  const body = (
    <>
      {champion && (
        <img
          src={championImageUrl(champion.image.full)}
          alt={champion.name}
          width={88}
          height={88}
          style={{ borderRadius: 8, border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' }}
        />
      )}
      <div
        style={{
          marginTop: 10,
          fontWeight: 600,
          color: 'var(--text-heading)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {build.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6, alignItems: 'center' }}>
        {roles.length === 0 ? (
          <img src={FILL_ICON_URL} alt="Fill" title="Fill" width={16} height={16} />
        ) : (
          roles.map((role) => <RoleIcon key={role} role={role} size={16} />)
        )}
      </div>
      <small style={{ color: 'var(--text-dim)' }}>{new Date(build.updatedAt).toLocaleDateString()}</small>
    </>
  )

  return (
    <div
      className="card"
      style={{
        padding: 16,
        width: 184,
        position: 'relative',
        borderColor: selectionMode && selected ? 'var(--gold)' : undefined,
        boxShadow: selectionMode && selected ? 'var(--shadow-md)' : undefined,
      }}
    >
      {selectionMode ? (
        <div onClick={() => onToggleSelect?.(build.id)} style={{ cursor: 'pointer' }}>
          {body}
        </div>
      ) : (
        <Link to={`/build/${build.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {body}
        </Link>
      )}
      {selectionMode ? (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={() => onToggleSelect?.(build.id)}
          style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, cursor: 'pointer' }}
        />
      ) : (
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => toggleFavorite(build.id)}
            style={
              build.favorite
                ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)', flex: 1 }
                : { flex: 1 }
            }
          >
            {build.favorite ? '★ Favorite' : '☆ Favorite'}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (await confirm(`Delete "${build.title}"? This can't be undone.`)) deleteBuild(build.id)
            }}
            title="Delete build"
            style={{ color: 'var(--danger)' }}
          >
            🗑
          </button>
        </div>
      )}
      {dialog}
    </div>
  )
}
