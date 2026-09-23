import type { SkillKey, SkillOrder } from '../types/build'
import type { RunePage } from '../types/runes'

export const SKILL_KEYS: SkillKey[] = ['Q', 'W', 'E', 'R']
export const SKILL_POINTS = 18

// Inspiration's Triple Tonic ("Upon reaching level 9, gain an Elixir of Skill") — the elixir
// grants one extra skill point, so the 10th point comes from it and level 18 is never needed.
export const TRIPLE_TONIC_RUNE_ID = 8313
export const ELIXIR_OF_SKILL_IMAGE = '2150.png'
export const ELIXIR_POINT_INDEX = 9

export function emptySkillOrder(): SkillOrder {
  return Array.from({ length: SKILL_POINTS }, () => null)
}

export function hasTripleTonic(pages: RunePage[]): boolean {
  return pages.some(
    (p) =>
      p.primaryRuneIds.includes(TRIPLE_TONIC_RUNE_ID) ||
      p.variants.some((v) => v.secondaryRuneIds.includes(TRIPLE_TONIC_RUNE_ID)),
  )
}

// The champion level a skill point is spent at. With the Elixir of Skill the 10th point is the
// elixir, drunk at level 9, so every later point comes one level earlier.
function levelOfPoint(index: number, elixir: boolean): number {
  return elixir && index >= ELIXIR_POINT_INDEX ? index : index + 1
}

// Standard League leveling: a basic ability's rank can't exceed ceil(level / 2) (max 5), and R's
// rank can't exceed 1/2/3 before levels 6/11/16. The elixir can't break those caps either.
function maxRank(key: SkillKey, level: number): number {
  if (key === 'R') return level >= 16 ? 3 : level >= 11 ? 2 : level >= 6 ? 1 : 0
  return Math.min(5, Math.ceil(level / 2))
}

// Fills every point legally from a max order over the three basics (e.g. Q > W > E): levels 1-3
// unlock them in that order, R is taken whenever it can be ranked up, and every other point goes
// to the highest-priority basic that isn't capped yet.
export function autoFillSkillOrder(priority: SkillKey[], elixir: boolean): SkillOrder {
  const ranks: Record<SkillKey, number> = { Q: 0, W: 0, E: 0, R: 0 }
  return Array.from({ length: SKILL_POINTS }, (_, i) => {
    const level = levelOfPoint(i, elixir)
    const key =
      i < priority.length
        ? priority[i]
        : [...(['R'] as SkillKey[]), ...priority].find((k) => ranks[k] < maxRank(k, level))
    if (!key) return null
    ranks[key]++
    return key
  })
}

// Clicking a column's already-chosen ability clears that point instead of re-setting it.
export function setSkillPoint(order: SkillOrder, index: number, key: SkillKey): SkillOrder {
  return order.map((k, i) => (i === index ? (k === key ? null : key) : k))
}
