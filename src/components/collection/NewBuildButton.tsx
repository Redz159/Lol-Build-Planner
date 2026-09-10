import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameData } from '../../state/GameDataContext'
import { useCollection } from '../../state/CollectionContext'
import { newId } from '../../lib/id'
import type { Build } from '../../types/build'

export function NewBuildButton() {
  const { champions } = useGameData()
  const { addBuild } = useCollection()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [championId, setChampionId] = useState('')
  const [title, setTitle] = useState('')
  const championRef = useRef<HTMLSelectElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) championRef.current?.focus()
  }, [open])

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        + New build
      </button>
    )
  }

  const submit = () => {
    const champion = champions.find((c) => c.id === championId)
    if (!champion) return
    const now = new Date().toISOString()
    const build: Build = {
      id: newId(),
      champion: { id: champion.id, name: champion.name },
      title: title.trim() || champion.name,
      runePages: [],
      itemSlots: [],
      customTags: [],
      favorite: false,
      createdAt: now,
      updatedAt: now,
    }
    addBuild(build)
    setOpen(false)
    setChampionId('')
    setTitle('')
    navigate(`/build/${build.id}`, { state: { startInEdit: true } })
  }

  return (
    <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--text-heading)', fontSize: 14 }}>
        New build
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          ref={championRef}
          value={championId}
          onChange={(e) => setChampionId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              titleRef.current?.focus()
            }
          }}
        >
          <option value="">Select champion...</option>
          {champions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          ref={titleRef}
          type="text"
          placeholder="Build title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && championId) submit()
          }}
        />
        <button type="button" disabled={!championId} onClick={submit}>
          Create
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
