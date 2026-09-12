import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '../../state/CollectionContext'
import { useGameData } from '../../state/GameDataContext'
import { looksLikeBuildJson, parseBuildJson } from '../../lib/exportImport'
import { parseLeagueItemSet, slotsAndItemsFromParsedSet } from '../../lib/leagueItemSet'
import { newId } from '../../lib/id'
import { emptyLoadout } from '../../lib/loadouts'
import type { Build } from '../../types/build'
import type { BuildItems, ItemSlot } from '../../types/items'
import { ChampionSelect } from './ChampionSelect'

// What a League item set becomes before we know which champion it's for — held here while the
// user picks one, then turned into a Build.
interface PendingItemSet {
  title: string
  itemSlots: ItemSlot[]
  items: BuildItems
}

export function ImportBuildButton() {
  const { addBuild } = useCollection()
  const { champions } = useGameData()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const championRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingItemSet | null>(null)
  const [championId, setChampionId] = useState('')

  useEffect(() => {
    if (pending) championRef.current?.focus()
  }, [pending])

  const finishImport = (draft: Pick<Build, 'champion' | 'title' | 'loadouts' | 'favorite'>) => {
    const now = new Date().toISOString()
    const build: Build = { ...draft, id: newId(), createdAt: now, updatedAt: now }
    addBuild(build)
    navigate(`/build/${build.id}`, { state: { startInEdit: true } })
  }

  const importText = (text: string) => {
    setError(null)
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      setError('That is not valid JSON.')
      return
    }
    try {
      if (looksLikeBuildJson(raw)) {
        finishImport(parseBuildJson(raw))
        return
      }
      if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).blocks)) {
        const parsed = parseLeagueItemSet(text)
        const { itemSlots, items } = slotsAndItemsFromParsedSet(parsed)
        const matches = champions.filter((c) => parsed.associatedChampionKeys.includes(Number(c.key)))
        if (matches.length === 1) {
          const champion = matches[0]
          finishImport({
            champion: { id: champion.id, name: champion.name },
            title: parsed.title || champion.name,
            loadouts: [{ ...emptyLoadout(), itemSlots, items }],
            favorite: false,
          })
        } else {
          setPending({ title: parsed.title, itemSlots, items })
        }
        return
      }
      setError('That does not look like a build file or a League item set.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import that.')
    }
  }

  const handleFile = async (file: File) => {
    importText(await file.text())
  }

  const pasteFromClipboard = async () => {
    try {
      importText(await navigator.clipboard.readText())
    } catch {
      setError('Could not read the clipboard — your browser may need permission, or try the file option instead.')
    }
  }

  const submitPendingChampion = () => {
    if (!pending) return
    const champion = champions.find((c) => c.id === championId)
    if (!champion) return
    finishImport({
      champion: { id: champion.id, name: champion.name },
      title: pending.title || champion.name,
      loadouts: [{ ...emptyLoadout(), itemSlots: pending.itemSlots, items: pending.items }],
      favorite: false,
    })
    setPending(null)
    setChampionId('')
  }

  if (pending) {
    return (
      <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--text-heading)', fontSize: 14 }}>
          Which champion is {pending.title ? `"${pending.title}"` : 'this item set'} for?
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ChampionSelect ref={championRef} champions={champions} value={championId} onChange={setChampionId} onConfirm={submitPendingChampion} />
          <button type="button" disabled={!championId} onClick={submitPendingChampion}>
            Import
          </button>
          <button
            type="button"
            onClick={() => {
              setPending(null)
              setChampionId('')
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Import build
      </button>
      <button type="button" onClick={() => void pasteFromClipboard()}>
        Paste from clipboard
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, alignSelf: 'center' }}>{error}</div>}
    </>
  )
}
