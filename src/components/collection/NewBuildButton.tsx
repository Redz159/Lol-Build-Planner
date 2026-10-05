import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useGameData } from '../../state/GameDataContext'
import { useCollection } from '../../state/CollectionContext'
import { newId } from '../../lib/id'
import type { Build } from '../../types/build'
import { emptyLoadout } from '../../lib/loadouts'
import { ChampionSelect } from './ChampionSelect'
import { activeButtonStyle, primaryButtonStyle, toolbarPanelStyle, toolbarPanelTitleStyle } from './toolbarStyles'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Where the panel renders: the row below the toolbar (see CollectionPage).
  panelSlot: HTMLElement | null
}

export function NewBuildButton({ open, onOpenChange, panelSlot }: Props) {
  const { champions } = useGameData()
  const { addBuild } = useCollection()
  const navigate = useNavigate()
  const [championId, setChampionId] = useState('')
  const [title, setTitle] = useState('')
  const championRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) championRef.current?.focus()
  }, [open])

  const submit = () => {
    const champion = champions.find((c) => c.id === championId)
    if (!champion) return
    const now = new Date().toISOString()
    const build: Build = {
      id: newId(),
      champion: { id: champion.id, name: champion.name },
      title: title.trim() || champion.name,
      loadouts: [emptyLoadout()],
      favorite: false,
      createdAt: now,
      updatedAt: now,
    }
    addBuild(build)
    onOpenChange(false)
    setChampionId('')
    setTitle('')
    navigate(`/build/${build.id}`, { state: { startInEdit: true } })
  }

  const panel = (
    <div className="panel" style={toolbarPanelStyle}>
      <div style={toolbarPanelTitleStyle}>New build</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <ChampionSelect
          ref={championRef}
          champions={champions}
          value={championId}
          onChange={setChampionId}
          onConfirm={() => titleRef.current?.focus()}
        />
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
        <button type="button" disabled={!championId} onClick={submit} style={primaryButtonStyle}>
          Create
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        style={open ? activeButtonStyle : undefined}
      >
        + New build
      </button>
      {open && panelSlot && createPortal(panel, panelSlot)}
    </>
  )
}
