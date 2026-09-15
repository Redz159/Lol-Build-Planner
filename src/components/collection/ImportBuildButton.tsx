import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '../../state/CollectionContext'
import { useGameData } from '../../state/GameDataContext'
import { looksLikeBuildJson, parseBuildJson } from '../../lib/exportImport'
import { parseLeagueItemSet, slotsAndItemsFromParsedSet } from '../../lib/leagueItemSet'
import { newId } from '../../lib/id'
import { emptyLoadout } from '../../lib/loadouts'
import type { Build } from '../../types/build'
import type { DDragonChampion } from '../../types/ddragon'
import type { BuildItems, ItemSlot } from '../../types/items'
import { ChampionSelect } from './ChampionSelect'

// What a League item set becomes before we know which champion it's for — held here while the
// user picks one, then turned into a Build.
interface PendingItemSet {
  title: string
  itemSlots: ItemSlot[]
  items: BuildItems
}

type ParsedFile =
  | { kind: 'build'; draft: Pick<Build, 'champion' | 'title' | 'loadouts' | 'favorite'> }
  | { kind: 'pending'; pending: PendingItemSet }

// Shared by the file picker and the clipboard-paste path. Throws a plain-language error for
// anything that isn't either shape, same as before — just factored out so a batch of files can
// each fail or succeed independently instead of one bad file aborting the whole import.
function parseImportedText(text: string, champions: DDragonChampion[]): ParsedFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That is not valid JSON.')
  }
  if (looksLikeBuildJson(raw)) {
    return { kind: 'build', draft: parseBuildJson(raw) }
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).blocks)) {
    const parsed = parseLeagueItemSet(text)
    const { itemSlots, items } = slotsAndItemsFromParsedSet(parsed)
    const matches = champions.filter((c) => parsed.associatedChampionKeys.includes(Number(c.key)))
    if (matches.length === 1) {
      const champion = matches[0]
      return {
        kind: 'build',
        draft: {
          champion: { id: champion.id, name: champion.name },
          title: parsed.title || champion.name,
          loadouts: [{ ...emptyLoadout(), itemSlots, items }],
          favorite: false,
        },
      }
    }
    return { kind: 'pending', pending: { title: parsed.title, itemSlots, items } }
  }
  throw new Error('That does not look like a build file or a League item set.')
}

export function ImportBuildButton() {
  const { addBuild } = useCollection()
  const { champions } = useGameData()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const championRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [importedCount, setImportedCount] = useState(0)
  const [pendingQueue, setPendingQueue] = useState<PendingItemSet[]>([])
  const [championId, setChampionId] = useState('')
  // Only a single file (picked or pasted) jumps straight into editing it, same as before —
  // several at once just lands them all in the collection, since there's no one obvious build to
  // jump into.
  const [singleFileMode, setSingleFileMode] = useState(true)

  const pending = pendingQueue[0] ?? null

  useEffect(() => {
    if (pending) championRef.current?.focus()
  }, [pending])

  const addImportedBuild = (draft: Pick<Build, 'champion' | 'title' | 'loadouts' | 'favorite'>): Build => {
    const now = new Date().toISOString()
    const build: Build = { ...draft, id: newId(), createdAt: now, updatedAt: now }
    addBuild(build)
    setImportedCount((n) => n + 1)
    return build
  }

  const finishImport = (draft: Pick<Build, 'champion' | 'title' | 'loadouts' | 'favorite'>, navigateAfter: boolean) => {
    const build = addImportedBuild(draft)
    if (navigateAfter) navigate(`/build/${build.id}`, { state: { startInEdit: true } })
  }

  const importFiles = async (files: File[]) => {
    setErrors([])
    setImportedCount(0)
    const isSingle = files.length === 1
    setSingleFileMode(isSingle)
    const texts = await Promise.all(files.map((f) => f.text()))
    const nextPending: PendingItemSet[] = []
    const nextErrors: string[] = []
    for (const text of texts) {
      try {
        const result = parseImportedText(text, champions)
        if (result.kind === 'build') finishImport(result.draft, isSingle)
        else nextPending.push(result.pending)
      } catch (e) {
        nextErrors.push(e instanceof Error ? e.message : 'Could not import that.')
      }
    }
    setPendingQueue(nextPending)
    setErrors(nextErrors)
  }

  const pasteFromClipboard = async () => {
    try {
      await importFiles([new File([await navigator.clipboard.readText()], 'clipboard.json')])
    } catch {
      setErrors(['Could not read the clipboard — your browser may need permission, or try the file option instead.'])
    }
  }

  const submitPendingChampion = () => {
    if (!pending) return
    const champion = champions.find((c) => c.id === championId)
    if (!champion) return
    const isLast = pendingQueue.length === 1
    finishImport(
      {
        champion: { id: champion.id, name: champion.name },
        title: pending.title || champion.name,
        loadouts: [{ ...emptyLoadout(), itemSlots: pending.itemSlots, items: pending.items }],
        favorite: false,
      },
      singleFileMode && isLast,
    )
    setPendingQueue((q) => q.slice(1))
    setChampionId('')
  }

  const skipPendingChampion = () => {
    setPendingQueue((q) => q.slice(1))
    setChampionId('')
  }

  if (pending) {
    return (
      <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--text-heading)', fontSize: 14 }}>
          Which champion is {pending.title ? `"${pending.title}"` : 'this item set'} for?
          {pendingQueue.length > 1 && (
            <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> ({pendingQueue.length} left)</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ChampionSelect ref={championRef} champions={champions} value={championId} onChange={setChampionId} onConfirm={submitPendingChampion} />
          <button type="button" disabled={!championId} onClick={submitPendingChampion}>
            Import
          </button>
          <button type="button" onClick={skipPendingChampion}>
            Skip
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Import build{'…'}
      </button>
      <button type="button" onClick={() => void pasteFromClipboard()}>
        Paste from clipboard
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = e.target.files ? [...e.target.files] : []
          if (files.length > 0) void importFiles(files)
          e.target.value = ''
        }}
      />
      {importedCount > 0 && (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, alignSelf: 'center' }}>
          Imported {importedCount} build{importedCount === 1 ? '' : 's'}.
        </div>
      )}
      {errors.length > 0 && (
        <div style={{ color: 'var(--danger)', fontSize: 12, alignSelf: 'center' }}>
          {errors.length === 1 ? errors[0] : `${errors.length} files couldn't be imported.`}
        </div>
      )}
    </>
  )
}
