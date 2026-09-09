import { Link } from 'react-router-dom'
import type { Build } from '../../types/build'
import { useGameData } from '../../state/GameDataContext'
import { useCollection } from '../../state/CollectionContext'
import { championImageUrl } from '../../lib/ddragon'

export function BuildCard({ build }: { build: Build }) {
  const { champions } = useGameData()
  const { toggleFavorite } = useCollection()
  const champion = champions.find((c) => c.id === build.champion.id)

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
        <small style={{ color: 'var(--text-dim)' }}>{new Date(build.updatedAt).toLocaleDateString()}</small>
      </Link>
      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={() => toggleFavorite(build.id)}
          style={
            build.favorite
              ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)', width: '100%' }
              : { width: '100%' }
          }
        >
          {build.favorite ? '★ Favorite' : '☆ Favorite'}
        </button>
      </div>
    </div>
  )
}
