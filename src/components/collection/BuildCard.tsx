import { Link } from 'react-router-dom'
import type { Build } from '../../types/build'
import { useGameData } from '../../state/GameDataContext'
import { useCollection } from '../../state/CollectionContext'
import { championImageUrl } from '../../lib/ddragon'
import { ROLE_LABELS, buildRoles } from '../../lib/loadouts'

export function BuildCard({ build }: { build: Build }) {
  const { champions } = useGameData()
  const { toggleFavorite, deleteBuild } = useCollection()
  const champion = champions.find((c) => c.id === build.champion.id)
  const roles = buildRoles(build)

  return (
    <div className="card" style={{ padding: 16, width: 184 }}>
      <Link to={`/build/${build.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {roles.length === 0 ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 9,
                border: '1px solid var(--border-strong)',
                color: 'var(--text-dim)',
              }}
            >
              Fill
            </span>
          ) : (
            roles.map((role) => (
              <span
                key={role}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 9,
                  border: '1px solid var(--gold)',
                  color: 'var(--gold-bright)',
                }}
              >
                {ROLE_LABELS[role]}
              </span>
            ))
          )}
        </div>
        <small style={{ color: 'var(--text-dim)' }}>{new Date(build.updatedAt).toLocaleDateString()}</small>
      </Link>
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
          onClick={() => {
            if (confirm(`Delete "${build.title}"?`)) deleteBuild(build.id)
          }}
          title="Delete build"
          style={{ color: 'var(--danger)' }}
        >
          🗑
        </button>
      </div>
    </div>
  )
}
