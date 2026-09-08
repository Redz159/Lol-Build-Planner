import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type { Build } from '../types/build'
import type { Collection } from '../types/collection'
import { loadCollection, saveCollection } from '../lib/storage'

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
}

const CollectionContext = createContext<CollectionApi | null>(null)

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadCollection)

  useEffect(() => {
    saveCollection(state)
  }, [state])

  const api: CollectionApi = {
    builds: state.builds,
    addBuild: (build) => dispatch({ type: 'ADD_BUILD', build }),
    updateBuild: (build) => dispatch({ type: 'UPDATE_BUILD', build }),
    deleteBuild: (id) => dispatch({ type: 'DELETE_BUILD', id }),
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
      dispatch({ type: 'DUPLICATE_BUILD', id, newBuild })
    },
    toggleFavorite: (id) => dispatch({ type: 'TOGGLE_FAVORITE', id }),
    replaceAll: (collection) => dispatch({ type: 'REPLACE_ALL', collection }),
  }

  return <CollectionContext.Provider value={api}>{children}</CollectionContext.Provider>
}

export function useCollection(): CollectionApi {
  const ctx = useContext(CollectionContext)
  if (!ctx) throw new Error('useCollection must be used within a CollectionProvider')
  return ctx
}
