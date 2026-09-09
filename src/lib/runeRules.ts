import { newId } from './id'
import { reorder } from './reorder'
import type { RunePage, RuneVariant, ShardSelection } from '../types/runes'

export function createVariant(): RuneVariant {
  return {
    id: newId(),
    secondaryTreeId: 0,
    secondaryRuneIds: [],
    preferredSecondaryRuneIds: [],
    shards: { offense: [], flex: [], defense: [] },
    preferredShards: { offense: [], flex: [], defense: [] },
  }
}

export function createRunePage(): RunePage {
  return {
    id: newId(),
    primaryTreeId: 0,
    keystoneId: 0,
    preferredKeystone: false,
    primaryRuneIds: [],
    preferredPrimaryRuneIds: [],
    variants: [createVariant()],
  }
}

// Marks (or unmarks) the given page's keystone/setup as the build-wide "preferred" one,
// clearing that flag from every other page since only one setup can be the default.
export function setPreferredKeystone(pages: RunePage[], pageId: string, preferred: boolean): RunePage[] {
  return pages.map((p) => {
    if (p.id === pageId) return { ...p, preferredKeystone: preferred }
    return preferred ? { ...p, preferredKeystone: false } : p
  })
}

// Clears the keystone on the duplicate so it starts fresh (like a new page) instead of
// silently joining the original's keystone group.
export function duplicateRunePage(page: RunePage): RunePage {
  return {
    ...page,
    id: newId(),
    keystoneId: 0,
    preferredKeystone: false,
    variants: page.variants.map((v) => ({ ...v, id: newId() })),
  }
}

// Moves every page belonging to one keystone group to sit where another group currently is —
// used when the user drags the keystone-switcher icons to reorder groups.
export function reorderPageGroups(pages: RunePage[], fromKeystoneId: number, toKeystoneId: number): RunePage[] {
  const order: number[] = []
  for (const p of pages) {
    if (p.keystoneId && !order.includes(p.keystoneId)) order.push(p.keystoneId)
  }
  const fromIndex = order.indexOf(fromKeystoneId)
  const toIndex = order.indexOf(toKeystoneId)
  if (fromIndex === -1 || toIndex === -1) return pages

  const reorderedIds = reorder(order, fromIndex, toIndex)
  const drafts = pages.filter((p) => !p.keystoneId)
  const grouped = reorderedIds.flatMap((id) => pages.filter((p) => p.keystoneId === id))
  return [...grouped, ...drafts]
}

export function selectPrimaryTree(page: RunePage, treeId: number): RunePage {
  const variants = page.variants.map((v) =>
    v.secondaryTreeId === treeId
      ? { ...v, secondaryTreeId: 0, secondaryRuneIds: [], preferredSecondaryRuneIds: [] }
      : v,
  )
  return {
    ...page,
    primaryTreeId: treeId,
    keystoneId: 0,
    preferredKeystone: false,
    primaryRuneIds: [],
    preferredPrimaryRuneIds: [],
    variants,
  }
}

export function selectKeystone(page: RunePage, keystoneId: number): RunePage {
  return { ...page, keystoneId }
}

// Plain click toggles a minor rune's viability. Ctrl/cmd+click toggles it as one of the row's
// preferred picks instead (implying viability) — more than one per row is allowed, for cases
// where two options are equally good.
export function selectPrimaryRune(page: RunePage, runeId: number, preferred: boolean): RunePage {
  const isViable = page.primaryRuneIds.includes(runeId)

  if (!preferred) {
    if (isViable) {
      return {
        ...page,
        primaryRuneIds: page.primaryRuneIds.filter((id) => id !== runeId),
        preferredPrimaryRuneIds: page.preferredPrimaryRuneIds.filter((id) => id !== runeId),
      }
    }
    return { ...page, primaryRuneIds: [...page.primaryRuneIds, runeId] }
  }

  const isPreferred = page.preferredPrimaryRuneIds.includes(runeId)
  if (isPreferred) {
    return { ...page, preferredPrimaryRuneIds: page.preferredPrimaryRuneIds.filter((id) => id !== runeId) }
  }
  const primaryRuneIds = isViable ? page.primaryRuneIds : [...page.primaryRuneIds, runeId]
  return { ...page, primaryRuneIds, preferredPrimaryRuneIds: [...page.preferredPrimaryRuneIds, runeId] }
}

function updateVariant(page: RunePage, variantId: string, fn: (v: RuneVariant) => RuneVariant): RunePage {
  return { ...page, variants: page.variants.map((v) => (v.id === variantId ? fn(v) : v)) }
}

export function selectSecondaryTree(page: RunePage, variantId: string, treeId: number): RunePage {
  if (treeId === page.primaryTreeId) return page
  return updateVariant(page, variantId, (v) => ({
    ...v,
    secondaryTreeId: treeId,
    secondaryRuneIds: [],
    preferredSecondaryRuneIds: [],
  }))
}

// Plain click toggles a minor rune's viability. Ctrl/cmd+click toggles it as one of the row's
// preferred picks instead (implying viability) — more than one per row is allowed, for cases
// where two options are equally good.
export function selectSecondaryRune(
  page: RunePage,
  variantId: string,
  runeId: number,
  preferred: boolean,
): RunePage {
  return updateVariant(page, variantId, (v) => {
    const isViable = v.secondaryRuneIds.includes(runeId)

    if (!preferred) {
      if (isViable) {
        return {
          ...v,
          secondaryRuneIds: v.secondaryRuneIds.filter((id) => id !== runeId),
          preferredSecondaryRuneIds: v.preferredSecondaryRuneIds.filter((id) => id !== runeId),
        }
      }
      return { ...v, secondaryRuneIds: [...v.secondaryRuneIds, runeId] }
    }

    const isPreferred = v.preferredSecondaryRuneIds.includes(runeId)
    if (isPreferred) {
      return { ...v, preferredSecondaryRuneIds: v.preferredSecondaryRuneIds.filter((id) => id !== runeId) }
    }
    const secondaryRuneIds = isViable ? v.secondaryRuneIds : [...v.secondaryRuneIds, runeId]
    return { ...v, secondaryRuneIds, preferredSecondaryRuneIds: [...v.preferredSecondaryRuneIds, runeId] }
  })
}

// Plain click toggles a shard's viability. Ctrl/cmd+click toggles it as one of the row's
// preferred picks instead — more than one per row is allowed, for equally-good options.
export function selectShard(
  page: RunePage,
  variantId: string,
  row: 'offense' | 'flex' | 'defense',
  shardId: number,
  preferred: boolean,
): RunePage {
  return updateVariant(page, variantId, (v) => {
    const current = v.shards[row]
    const currentPreferred = v.preferredShards[row]
    const isViable = current.includes(shardId)

    if (!preferred) {
      if (isViable) {
        return {
          ...v,
          shards: { ...v.shards, [row]: current.filter((id) => id !== shardId) },
          preferredShards: { ...v.preferredShards, [row]: currentPreferred.filter((id) => id !== shardId) },
        }
      }
      return { ...v, shards: { ...v.shards, [row]: [...current, shardId] } }
    }

    const isPreferred = currentPreferred.includes(shardId)
    if (isPreferred) {
      return { ...v, preferredShards: { ...v.preferredShards, [row]: currentPreferred.filter((id) => id !== shardId) } }
    }
    const shards = isViable ? v.shards : { ...v.shards, [row]: [...current, shardId] }
    return { ...v, shards, preferredShards: { ...v.preferredShards, [row]: [...currentPreferred, shardId] } }
  })
}

// New variants start with the previous variant's shards, since shard picks are usually tree-independent.
export function addVariant(page: RunePage): RunePage {
  const last = page.variants[page.variants.length - 1]
  const variant = createVariant()
  if (last) {
    variant.shards = {
      offense: [...last.shards.offense],
      flex: [...last.shards.flex],
      defense: [...last.shards.defense],
    }
    variant.preferredShards = {
      offense: [...last.preferredShards.offense],
      flex: [...last.preferredShards.flex],
      defense: [...last.preferredShards.defense],
    }
  }
  return { ...page, variants: [...page.variants, variant] }
}

export function removeVariant(page: RunePage, variantId: string): RunePage {
  if (page.variants.length <= 1) return page
  return { ...page, variants: page.variants.filter((v) => v.id !== variantId) }
}

export interface RuneGroup {
  keystoneId: number
  primaryTreeId: number
  preferredKeystone: boolean
  primaryRuneIds: number[]
  preferredPrimaryRuneIds: number[]
  secondaryTrees: {
    treeId: number
    runeIds: number[]
    preferredRuneIds: number[]
    shards: ShardSelection
    preferredShards: ShardSelection
  }[]
}

// Groups all rune pages that share a keystone into one overlay: the union of every
// primary/secondary rune (and shard) picked by any page in the group, per row/tree,
// plus the union of whichever picks any of those pages marked as "preferred".
export function groupRunePages(pages: RunePage[]): RuneGroup[] {
  const byKeystone = new Map<number, RunePage[]>()
  for (const page of pages) {
    if (!page.keystoneId) continue
    const list = byKeystone.get(page.keystoneId) ?? []
    list.push(page)
    byKeystone.set(page.keystoneId, list)
  }

  return [...byKeystone.entries()].map(([keystoneId, groupPages]) => {
    const primaryTreeId = groupPages[0].primaryTreeId
    const preferredKeystone = groupPages.some((p) => p.preferredKeystone)
    const primaryRuneIds = [...new Set(groupPages.flatMap((p) => p.primaryRuneIds))]
    const preferredPrimaryRuneIds = [...new Set(groupPages.flatMap((p) => p.preferredPrimaryRuneIds))]

    const treeMap = new Map<
      number,
      {
        runeIds: Set<number>
        preferredRuneIds: Set<number>
        offense: Set<number>
        flex: Set<number>
        defense: Set<number>
        preferredOffense: Set<number>
        preferredFlex: Set<number>
        preferredDefense: Set<number>
      }
    >()
    for (const page of groupPages) {
      for (const variant of page.variants) {
        if (!variant.secondaryTreeId) continue
        const entry = treeMap.get(variant.secondaryTreeId) ?? {
          runeIds: new Set(),
          preferredRuneIds: new Set(),
          offense: new Set(),
          flex: new Set(),
          defense: new Set(),
          preferredOffense: new Set(),
          preferredFlex: new Set(),
          preferredDefense: new Set(),
        }
        variant.secondaryRuneIds.forEach((id) => entry.runeIds.add(id))
        variant.preferredSecondaryRuneIds.forEach((id) => entry.preferredRuneIds.add(id))
        variant.shards.offense.forEach((id) => entry.offense.add(id))
        variant.shards.flex.forEach((id) => entry.flex.add(id))
        variant.shards.defense.forEach((id) => entry.defense.add(id))
        variant.preferredShards.offense.forEach((id) => entry.preferredOffense.add(id))
        variant.preferredShards.flex.forEach((id) => entry.preferredFlex.add(id))
        variant.preferredShards.defense.forEach((id) => entry.preferredDefense.add(id))
        treeMap.set(variant.secondaryTreeId, entry)
      }
    }

    const secondaryTrees = [...treeMap.entries()].map(([treeId, e]) => ({
      treeId,
      runeIds: [...e.runeIds],
      preferredRuneIds: [...e.preferredRuneIds],
      shards: { offense: [...e.offense], flex: [...e.flex], defense: [...e.defense] },
      preferredShards: {
        offense: [...e.preferredOffense],
        flex: [...e.preferredFlex],
        defense: [...e.preferredDefense],
      },
    }))

    return { keystoneId, primaryTreeId, preferredKeystone, primaryRuneIds, preferredPrimaryRuneIds, secondaryTrees }
  })
}
