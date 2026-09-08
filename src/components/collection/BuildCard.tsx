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
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 14,
        width: 168,
        background: 'var(--bg-panel)',
      }}
    >
      <Link to={`/build/${build.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        {champion && (
          <img
            src={championImageUrl(champion.image.full)}
            alt={champion.name}
            width={64}
            height={64}
            style={{ borderRadius: 6, border: '1px solid var(--border-strong)' }}
          />
        )}
        <div style={{ marginTop: 8, fontWeight: 600, color: 'var(--text-heading)' }}>{build.title}</div>
        <small style={{ color: 'var(--text-dim)' }}>{new Date(build.updatedAt).toLocaleDateString()}</small>
      </Link>
      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={() => toggleFavorite(build.id)}
          style={build.favorite ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' } : undefined}
        >
          {build.favorite ? '★ Favorite' : '☆ Favorite'}
        </button>
      </div>
    </div>
  )
}
