import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getChampions, getItems, getRuneTrees } from '../lib/ddragon'
import type { DDragonChampion, DDragonItem, DDragonRuneTree } from '../types/ddragon'

interface GameData {
  champions: DDragonChampion[]
  items: DDragonItem[]
  runeTrees: DDragonRuneTree[]
  loading: boolean
  error: string | null
}

const GameDataContext = createContext<GameData | null>(null)

export function GameDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameData>({
    champions: [],
    items: [],
    runeTrees: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([getChampions(), getItems(), getRuneTrees()])
      .then(([champions, items, runeTrees]) => {
        if (cancelled) return
        setState({ champions, items, runeTrees, loading: false, error: null })
      })
      .catch((err: Error) => {
        if (cancelled) return
        setState((s) => ({ ...s, loading: false, error: err.message }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <GameDataContext.Provider value={state}>{children}</GameDataContext.Provider>
}

export function useGameData(): GameData {
  const ctx = useContext(GameDataContext)
  if (!ctx) throw new Error('useGameData must be used within a GameDataProvider')
  return ctx
}
