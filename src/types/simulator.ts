// Shape of public/data/champions/<id>.json, written by scripts/gen-champion-data.mjs from
// CommunityDragon's extracted game files. `calculations` is kept raw (the game's own
// mSpellCalculations tree) and interpreted by lib/spellCalc.
export interface ChampionBaseStats {
  hp: number
  hpPerLevel: number
  hpRegen: number
  hpRegenPerLevel: number
  // 0 = mana, 1 = energy, anything else = a champion-specific or no resource.
  resourceType: number
  resource: number
  resourcePerLevel: number
  resourceRegen: number
  resourceRegenPerLevel: number
  ad: number
  adPerLevel: number
  armor: number
  armorPerLevel: number
  mr: number
  mrPerLevel: number
  attackSpeed: number
  attackSpeedRatio: number
  attackSpeedPerLevel: number
  moveSpeed: number
  range: number
  critDamageMultiplier: number
  // 1 = adaptive force defaults to AP when bonus AD and AP are tied, 0 = AD.
  adaptiveApWeight: number
}

export interface SimSpell {
  scriptName?: string
  name: string
  tooltip?: string
  tooltipExtended?: string
  dataValues: Record<string, number[]>
  calculations: Record<string, unknown>
  effectAmounts: number[][]
  cooldown: number[]
  cost: number[]
  maxRank: number
  icon: string
}

export interface ChampionSimData {
  id: string
  stats: ChampionBaseStats
  passive: SimSpell
  spells: SimSpell[]
}

export type StatKey =
  | 'hp'
  | 'hpRegen'
  | 'resource'
  | 'resourceRegen'
  | 'ad'
  | 'ap'
  | 'armor'
  | 'mr'
  | 'as'
  | 'ms'
  | 'range'
  | 'crit'
  | 'critDamage'
  | 'ah'
  | 'lethality'
  | 'armorPen'
  | 'magicPenFlat'
  | 'magicPen'
  | 'lifeSteal'
  | 'omnivamp'
  | 'tenacity'
  | 'hsp'

// One line of a stat's hover breakdown: "Zhonya's Hourglass +50" with the item's icon.
export interface StatSource {
  label: string
  value: number
  iconUrl?: string
  // Shown as "+12%" rather than "+12" — for percent stats and multipliers.
  percent?: boolean
  // A multiplier (Rabadon's +30%) rather than an additive amount.
  multiplier?: boolean
}

export interface StatLine {
  total: number
  base: number
  bonus: number
  sources: StatSource[]
  // Extra explanation under the breakdown (soft caps, formulas, unmodelled effects).
  notes?: string[]
}

export interface StatBlock {
  level: number
  // Which way adaptive force/damage resolves for this loadout.
  adaptive: 'ad' | 'ap'
  // Ability haste only for Q/W/E (Legend: Haste) and only for R (Ultimate Hunter), on top of `ah`.
  basicAbilityHaste: number
  ultimateHaste: number
  stats: Record<StatKey, StatLine>
}

export type DamageType = 'physical' | 'magic' | 'true'

// The defending side of every damage number — just the numbers mitigation needs.
export interface TargetStats {
  hp: number
  armor: number
  bonusArmor: number
  mr: number
  bonusMr: number
}
