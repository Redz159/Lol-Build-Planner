import { createContext, useContext } from 'react'
import type { IconEntry } from '../../lib/guideIcons'

// ref ("item:6699", ...) → entry. Read by the inline icon node views to resolve their icon.
export const IconIndexContext = createContext<Map<string, IconEntry>>(new Map())

export function useIconEntry(ref: string): IconEntry | undefined {
  return useContext(IconIndexContext).get(ref)
}
