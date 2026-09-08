import type { RuneSelection } from '../types/runes'
import type { DDragonRuneTree } from '../types/ddragon'

export function selectPrimaryTree(selection: RuneSelection, treeId: number): RuneSelection {
  if (treeId === selection.secondaryTreeId) {
    return {
      ...selection,
      primaryTreeId: treeId,
      keystoneId: 0,
      primaryRuneIds: [],
      secondaryTreeId: 0,
      secondaryRuneIds: [],
    }
  }
  return { ...selection, primaryTreeId: treeId, keystoneId: 0, primaryRuneIds: [] }
}

export function selectKeystone(selection: RuneSelection, keystoneId: number): RuneSelection {
  return { ...selection, keystoneId }
}

// rowIndex is 0-based among the three non-keystone rows (tree.slots[rowIndex + 1])
export function selectPrimaryRune(
  selection: RuneSelection,
  tree: DDragonRuneTree,
  rowIndex: number,
  runeId: number,
): RuneSelection {
  const row = tree.slots[rowIndex + 1]
  if (!row) return selection
  const idsInRow = new Set(row.runes.map((r) => r.id))
  const next = selection.primaryRuneIds.filter((id) => !idsInRow.has(id))
  next.push(runeId)
  return { ...selection, primaryRuneIds: next }
}

export function selectSecondaryTree(selection: RuneSelection, treeId: number): RuneSelection {
  if (treeId === selection.primaryTreeId) return selection
  return { ...selection, secondaryTreeId: treeId, secondaryRuneIds: [] }
}

// rowIndex is 0-based among the three non-keystone rows; secondary can never touch the keystone row.
export function selectSecondaryRune(
  selection: RuneSelection,
  tree: DDragonRuneTree,
  rowIndex: number,
  runeId: number,
): RuneSelection {
  const row = tree.slots[rowIndex + 1]
  if (!row) return selection
  const idsInRow = new Set(row.runes.map((r) => r.id))
  const alreadySelected = selection.secondaryRuneIds.includes(runeId)
  const withoutThisRow = selection.secondaryRuneIds.filter((id) => !idsInRow.has(id))

  if (alreadySelected) {
    return { ...selection, secondaryRuneIds: withoutThisRow }
  }
  let next = [...withoutThisRow, runeId]
  if (next.length > 2) next = next.slice(next.length - 2)
  return { ...selection, secondaryRuneIds: next }
}

export function selectShard(
  selection: RuneSelection,
  row: 'offense' | 'flex' | 'defense',
  shardId: number,
): RuneSelection {
  return { ...selection, shards: { ...selection.shards, [row]: shardId } }
}
