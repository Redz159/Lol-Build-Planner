import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameData } from '../../state/GameDataContext'
import { useCollection } from '../../state/CollectionContext'
import { RIOT_REGIONS, type RiotRegionId } from '../../lib/riot/regions'
import { importBuildFromRiot, type ImportProgress } from '../../lib/riot/import'
import { ChampionSelect } from './ChampionSelect'

const STAGE_LABEL: Record<ImportProgress['stage'], string> = {
  account: 'Looking up account...',
  'match-list': 'Finding recent games...',
  'match-details': 'Reading match',
  done: 'Building loadout...',
}

// Dev-only: this button (and the whole Riot import flow) only exists in `npm run dev` builds.
// `import.meta.env.DEV` is statically replaced at build time, so `vite build` dead-code-strips
// this entire feature out of the production bundle shipped to GitHub Pages — regular visitors
// never see it, regardless of any local .env.local key.
export function RiotImportButton() {
  const { champions, runeTrees, items } = useGameData()
  const { addBuild } = useCollection()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [championId, setChampionId] = useState('')
  const [gameName, setGameName] = useState('')
  const [tagLine, setTagLine] = useState('')
  const [region, setRegion] = useState<RiotRegionId>('europe')
  const [sampleSize, setSampleSize] = useState(30)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        ⚡ Import from Riot (dev)
      </button>
    )
  }

  const champion = champions.find((c) => c.id === championId)
  const canSubmit = !!champion && gameName.trim() !== '' && tagLine.trim() !== '' && !progress

  const submit = async () => {
    if (!champion) return
    setError(null)
    setProgress({ stage: 'account', current: 0, total: 1 })
    try {
      const host = RIOT_REGIONS.find((r) => r.id === region)!.host
      const build = await importBuildFromRiot(
        host,
        gameName.trim(),
        tagLine.trim().replace(/^#/, ''),
        champion,
        Math.min(Math.max(sampleSize, 5), 100),
        runeTrees,
        items,
        setProgress,
      )
      addBuild(build)
      navigate(`/build/${build.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--text-heading)', fontSize: 14 }}>
        Import from Riot (local dev only)
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <ChampionSelect champions={champions} value={championId} onChange={setChampionId} />
        <input
          type="text"
          placeholder="Riot ID"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          style={{ width: 130 }}
        />
        <span style={{ color: 'var(--text-dim)' }}>#</span>
        <input
          type="text"
          placeholder="Tag"
          value={tagLine}
          onChange={(e) => setTagLine(e.target.value)}
          style={{ width: 70 }}
        />
        <select value={region} onChange={(e) => setRegion(e.target.value as RiotRegionId)}>
          {RIOT_REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
          Sample size
          <input
            type="number"
            min={5}
            max={100}
            value={sampleSize}
            onChange={(e) => setSampleSize(Number(e.target.value))}
            style={{ width: 60 }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" disabled={!canSubmit} onClick={submit}>
          {progress ? 'Importing...' : 'Import'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={!!progress}>
          Cancel
        </button>
        {progress && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {STAGE_LABEL[progress.stage]}
            {progress.stage === 'match-details' ? ` ${progress.current + 1}/${progress.total}` : ''}
          </span>
        )}
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
        Reads recent ranked/normal games for this champion, aggregates runes and items per role, and infers item
        exclusions once there's enough sample. ARAM and remade games are skipped. Trinkets/wards aren't tracked yet.
      </div>
    </div>
  )
}
