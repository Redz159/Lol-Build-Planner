import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react'
import type { Build } from '../types/build'
import type { Collection } from '../types/collection'
import { loadCollection, saveCollection } from '../lib/storage'

const MAX_UNDO_HISTORY = 50

type Action =
  | { type: 'ADD_BUILD'; build: Build }
  | { type: 'UPDATE_BUILD'; build: Build }
  | { type: 'DELETE_BUILD'; id: string }
  | { type: 'DUPLICATE_BUILD'; id: string; newBuild: Build }
  | { type: 'TOGGLE_FAVORITE'; id: string }
  | { type: 'REPLACE_ALL'; collection: Collection }

function reducer(state: Collection, action: Action): Collection {
  switch (action.type) {
    case 'ADD_BUILD':
      return { ...state, builds: [...state.builds, action.build] }
    case 'UPDATE_BUILD':
      return {
        ...state,
        builds: state.builds.map((b) => (b.id === action.build.id ? action.build : b)),
      }
    case 'DELETE_BUILD':
      return { ...state, builds: state.builds.filter((b) => b.id !== action.id) }
    case 'DUPLICATE_BUILD':
      return { ...state, builds: [...state.builds, action.newBuild] }
    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        builds: state.builds.map((b) =>
          b.id === action.id ? { ...b, favorite: !b.favorite } : b,
        ),
      }
    case 'REPLACE_ALL':
      return action.collection
  }
}

interface CollectionApi {
  builds: Build[]
  addBuild: (build: Build) => void
  updateBuild: (build: Build) => void
  deleteBuild: (id: string) => void
  duplicateBuild: (id: string) => void
  toggleFavorite: (id: string) => void
  replaceAll: (collection: Collection) => void
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

const CollectionContext = createContext<CollectionApi | null>(null)

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadCollection)
  // Plain state (not a ref) so canUndo/canRedo can drive a button's disabled state, not just the
  // keyboard shortcut.
  const [past, setPast] = useState<Collection[]>([])
  const [future, setFuture] = useState<Collection[]>([])

  useEffect(() => {
    saveCollection(state)
  }, [state])

  const undo = () => {
    const previous = past[past.length - 1]
    if (!previous) return
    setPast((p) => p.slice(0, -1))
    setFuture((f) => [state, ...f].slice(0, MAX_UNDO_HISTORY))
    dispatch({ type: 'REPLACE_ALL', collection: previous })
  }

  const redo = () => {
    const next = future[0]
    if (!next) return
    setFuture((f) => f.slice(1))
    setPast((p) => [...p, state].slice(-MAX_UNDO_HISTORY))
    dispatch({ type: 'REPLACE_ALL', collection: next })
  }

  // Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z (or Ctrl+Y) redoes, unless a text field has focus (so
  // native text-undo in inputs still works).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      const isUndo = key === 'z' && !e.shiftKey
      const isRedo = (key === 'z' && e.shiftKey) || key === 'y'
      if (!isUndo && !isRedo) return
      const target = e.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return
      e.preventDefault()
      if (isUndo) undo()
      else redo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [past, future, state])

  // Any new edit invalidates whatever was available to redo.
  const withHistory = (action: Action) => {
    setPast((p) => [...p, state].slice(-MAX_UNDO_HISTORY))
    setFuture([])
    dispatch(action)
  }

  const api: CollectionApi = {
    builds: state.builds,
    addBuild: (build) => withHistory({ type: 'ADD_BUILD', build }),
    updateBuild: (build) => withHistory({ type: 'UPDATE_BUILD', build }),
    deleteBuild: (id) => withHistory({ type: 'DELETE_BUILD', id }),
    duplicateBuild: (id) => {
      const source = state.builds.find((b) => b.id === id)
      if (!source) return
      const now = new Date().toISOString()
      const newBuild: Build = {
        ...source,
        id: crypto.randomUUID(),
        title: `${source.title} (copy)`,
        createdAt: now,
        updatedAt: now,
      }
      withHistory({ type: 'DUPLICATE_BUILD', id, newBuild })
    },
    toggleFavorite: (id) => withHistory({ type: 'TOGGLE_FAVORITE', id }),
    replaceAll: (collection) => withHistory({ type: 'REPLACE_ALL', collection }),
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
  }

  return <CollectionContext.Provider value={api}>{children}</CollectionContext.Provider>
}

export function useCollection(): CollectionApi {
  const ctx = useContext(CollectionContext)
  if (!ctx) throw new Error('useCollection must be used within a CollectionProvider')
  return ctx
}
