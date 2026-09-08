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
    <div style={{ border: '1px solid #444', borderRadius: 8, padding: 12, width: 160 }}>
      <Link to={`/build/${build.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        {champion && (
          <img
            src={championImageUrl(champion.image.full)}
            alt={champion.name}
            width={64}
            height={64}
            style={{ borderRadius: 6 }}
          />
        )}
        <div>{build.title}</div>
        <small>{new Date(build.updatedAt).toLocaleDateString()}</small>
      </Link>
      <button type="button" onClick={() => toggleFavorite(build.id)}>
        {build.favorite ? '★ Favorite' : '☆ Favorite'}
      </button>
    </div>
  )
}
