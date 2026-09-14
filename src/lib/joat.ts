import type { DDragonItem } from '../types/ddragon'

// Data Dragon's raw numeric stat mods — a much smaller, incomplete set (no Mana Regen, Ability
// Haste, or any penetration key exists in it for any item) than the tooltip text covers, but
// it's a factual fallback for the rare item whose `description` is blank in Data Dragon (e.g.
// World Atlas), so it only ever partially recovers what the real tooltip would show.
const STAT_NAME_BY_RAW_KEY: Record<string, string> = {
  FlatHPPoolMod: 'Health',
  FlatMPPoolMod: 'Mana',
  FlatArmorMod: 'Armor',
  FlatSpellBlockMod: 'Magic Resist',
  FlatPhysicalDamageMod: 'Attack Damage',
  FlatMagicDamageMod: 'Ability Power',
  FlatCritChanceMod: 'Critical Strike Chance',
  FlatHPRegenMod: 'Health Regen',
  FlatMovementSpeedMod: 'Move Speed',
  PercentMovementSpeedMod: '% Move Speed',
  PercentAttackSpeedMod: '% Attack Speed',
  PercentLifeStealMod: '% Life Steal',
}

function statNamesFromRawStats(item: DDragonItem): string[] {
  return Object.keys(item.stats)
    .map((key) => STAT_NAME_BY_RAW_KEY[key])
    .filter((name): name is string => !!name)
}

// World Atlas's Data Dragon description is blank across every patch checked — a persistent gap,
// not a one-off. Its stat names are hardcoded from the rest of its own evolution line (Runic
// Compass, Bounty of Worlds, and each final-tier choice), which all share the same four stat
// categories at every tier, just with bigger numbers: Health, Base Health Regen, Base Mana
// Regen, Gold Per 10 Seconds.
const STAT_NAMES_BY_ITEM_NAME: Record<string, string[]> = {
  'World Atlas': ['Health', 'Base Health Regen', 'Base Mana Regen', 'Gold Per 10 Seconds'],
}

// Reads the exact stat lines an item's own tooltip lists in its <stats> block (e.g. "18 Ability
// Power", "6% Move Speed") — this is what Jack Of All Trades actually counts stacks from in-game.
// Data Dragon's `tags` array looked like a shortcut for the same thing, but it's really a
// broader search/filter categorization: it fires for tooltip passives with no real stat behind
// them (Doran's Ring is tagged ManaRegen for its Drain passive despite granting no such stat),
// and doesn't distinguish real stat items from consumables (Refillable Potion is tagged
// HealthRegen despite its <stats> block being empty).
//
// A flat and a percent version of the same stat (Move Speed, Magic Penetration, ...) are kept as
// two different names — they're different stat mods in-game, each worth its own stack.
function statNamesOf(item: DDragonItem): string[] {
  const match = item.description.match(/<stats>([\s\S]*?)<\/stats>/)
  const lines = match ? match[1].split(/<br\s*\/?>/i) : []
  const names = lines
    .map((line) => line.replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)
    .map((line) => {
      const valueMatch = line.match(/^([0-9.%+\-\s]+)(.*)$/)
      if (!valueMatch) return line
      const [, value, name] = valueMatch
      return value.includes('%') ? `% ${name.trim()}` : name.trim()
    })
    .filter(Boolean)
  if (names.length > 0) return names
  return STAT_NAMES_BY_ITEM_NAME[item.name] ?? statNamesFromRawStats(item)
}

// The distinct stat names a Jack Of All Trades stack count is actually based on, alphabetized
// for a stable display order — lets the UI show its work instead of just a bare number. The
// stack count itself is just this list's length.
export function joatStatNames(items: DDragonItem[]): string[] {
  const names = new Set<string>()
  for (const item of items) {
    for (const name of statNamesOf(item)) names.add(name)
  }
  return [...names].sort()
}
