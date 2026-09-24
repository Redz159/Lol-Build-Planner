import type { DDragonItem } from '../types/ddragon'
import type { StatKey } from '../types/simulator'

// Everything an item's stat block can grant. Most map straight onto a StatKey; the rest are
// percentages of something else that the stat engine resolves (base regen, move speed).
export type ItemStatKey = StatKey | 'msPct' | 'hpRegenPct' | 'resourceRegenPct'

export interface ItemStatMod {
  key: ItemStatKey
  // In the stat's display units: 40 for "40 Ability Haste", 25 for "25% Attack Speed".
  value: number
}

// Labels exactly as they appear inside Data Dragon's <stats> block. A label that can be flat or
// percent ("Move Speed", "Magic Penetration") has one entry per form.
const LABELS: Record<string, { flat?: ItemStatKey; percent?: ItemStatKey }> = {
  'Attack Damage': { flat: 'ad' },
  'Ability Power': { flat: 'ap' },
  Armor: { flat: 'armor' },
  'Magic Resist': { flat: 'mr' },
  Health: { flat: 'hp' },
  Mana: { flat: 'resource' },
  'Attack Speed': { percent: 'as' },
  'Critical Strike Chance': { percent: 'crit' },
  'Critical Strike Damage': { percent: 'critDamage' },
  'Ability Haste': { flat: 'ah' },
  Lethality: { flat: 'lethality' },
  'Armor Penetration': { percent: 'armorPen' },
  'Magic Penetration': { flat: 'magicPenFlat', percent: 'magicPen' },
  'Move Speed': { flat: 'ms', percent: 'msPct' },
  'Life Steal': { percent: 'lifeSteal' },
  Omnivamp: { percent: 'omnivamp' },
  'Base Health Regen': { percent: 'hpRegenPct' },
  'Base Mana Regen': { percent: 'resourceRegenPct' },
  Tenacity: { percent: 'tenacity' },
  'Heal and Shield Power': { percent: 'hsp' },
}

const cache = new Map<string, ItemStatMod[]>()

// Data Dragon's `item.stats` misses Ability Haste, Lethality, penetration and more, but the
// <stats> block at the top of the tooltip lists every stat the item grants, one per line:
// "<attention>40</attention> Ability Haste<br><attention>25%</attention> Attack Speed".
export function parseItemStats(item: DDragonItem): ItemStatMod[] {
  const cached = cache.get(item.id)
  if (cached) return cached
  const block = item.description.match(/<stats>(.*?)<\/stats>/)?.[1] ?? ''
  const mods: ItemStatMod[] = []
  for (const line of block.split(/<br\s*\/?>/)) {
    const match = line.replace(/<[^>]+>/g, '').trim().match(/^([\d.]+)(%?)\s+(.+)$/)
    if (!match) continue
    const entry = LABELS[match[3]]
    const key = match[2] ? entry?.percent : entry?.flat
    if (key) mods.push({ key, value: Number(match[1]) })
  }
  cache.set(item.id, mods)
  return mods
}

// Item passives that turn one stat into another. Only items whose 16.17 tooltip states the
// number are listed. Seraph's Embrace and Manamune leave it out of their text, so they aren't
// modelled rather than guessed at.
export type ItemConversion =
  | { kind: 'multiplyTotal'; stat: 'ap'; percent: number }
  | { kind: 'convert'; from: 'bonusHp' | 'bonusResource' | 'maxResource' | 'itemHp'; to: 'ad' | 'ap' | 'hp'; percent: number }

export const ITEM_CONVERSIONS: Record<string, ItemConversion> = {
  '3089': { kind: 'multiplyTotal', stat: 'ap', percent: 30 }, // Rabadon's Deathcap: "Increases your total Ability Power by 30%"
  '3003': { kind: 'convert', from: 'bonusResource', to: 'ap', percent: 1 }, // Archangel's Staff: "Ability Power equal to 1% bonus Mana"
  '3042': { kind: 'convert', from: 'maxResource', to: 'ad', percent: 2 }, // Muramana: "2% max Mana as bonus Attack Damage"
  '2501': { kind: 'convert', from: 'bonusHp', to: 'ad', percent: 5 }, // Overlord's Bloodmail: "5% of your bonus Health as Attack Damage"
  '4633': { kind: 'convert', from: 'bonusHp', to: 'ap', percent: 2 }, // Riftmaker: "2% of your bonus Health as Ability Power"
  '3083': { kind: 'convert', from: 'itemHp', to: 'hp', percent: 12 }, // Warmog's Armor: "bonus Health equal to 12% of your Item Health"
}
