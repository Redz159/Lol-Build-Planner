import type { ItemPlacement, ItemSituationalFlags } from '../../types/items'

// Shared by the example-build overview, its single-slot picker and the step-through wizard.
export const slotHeaderStyle = { color: 'var(--gold)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 }

// Pushes situational candidates after regular ones (stable within each group) and reports where
// the situational group starts, so a picker/wizard candidate grid can drop a divider there — same
// split BuildSlotsPanel already does for a slot's placed items.
export function situationalSplit(
  candidates: ItemPlacement[],
  itemSituational: ItemSituationalFlags,
): { sorted: ItemPlacement[]; dividerIndex: number } {
  const sorted = [...candidates].sort((a, b) => Number(!!itemSituational[a.itemId]) - Number(!!itemSituational[b.itemId]))
  const dividerIndex = sorted.findIndex((p) => itemSituational[p.itemId])
  return { sorted, dividerIndex }
}

export const situationalDividerStyle = {
  width: '100%',
  borderTop: '1px dashed var(--gold)',
  paddingTop: 6,
  marginTop: 2,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  color: 'var(--gold)',
}
