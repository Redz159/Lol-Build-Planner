export interface StatCategory {
  id: string
  label: string
  short: string
  color: string
}

// Data Dragon's own item.tags array is Riot's factual categorization of an item's stats —
// this maps those raw tag strings onto a small, deduped set of display categories.
// Several raw tags alias the same category (e.g. SpellBlock/MagicResist both mean MR).
const CATEGORY_BY_RAW_TAG: Record<string, StatCategory> = {
  Health: { id: 'health', label: 'Health', short: 'HP', color: '#3fa34d' },
  HealthRegen: { id: 'healthregen', label: 'Health Regen', short: 'HP5', color: '#3fa34d' },
  Mana: { id: 'mana', label: 'Mana', short: 'MP', color: '#3f7fa3' },
  ManaRegen: { id: 'manaregen', label: 'Mana Regen', short: 'MP5', color: '#3f7fa3' },
  Armor: { id: 'armor', label: 'Armor', short: 'AR', color: '#c9a227' },
  SpellBlock: { id: 'mr', label: 'Magic Resist', short: 'MR', color: '#8a6fff' },
  MagicResist: { id: 'mr', label: 'Magic Resist', short: 'MR', color: '#8a6fff' },
  Damage: { id: 'ad', label: 'Attack Damage', short: 'AD', color: '#d9704f' },
  SpellDamage: { id: 'ap', label: 'Ability Power', short: 'AP', color: '#5fa8ff' },
  AttackSpeed: { id: 'as', label: 'Attack Speed', short: 'AS', color: '#e0b64f' },
  CriticalStrike: { id: 'crit', label: 'Critical Strike', short: 'CRIT', color: '#e05f5f' },
  LifeSteal: { id: 'lifesteal', label: 'Life Steal', short: 'LS', color: '#c9455c' },
  SpellVamp: { id: 'omnivamp', label: 'Omnivamp', short: 'OV', color: '#c9457e' },
  CooldownReduction: { id: 'ah', label: 'Ability Haste', short: 'AH', color: '#4fc9c0' },
  AbilityHaste: { id: 'ah', label: 'Ability Haste', short: 'AH', color: '#4fc9c0' },
  ArmorPenetration: { id: 'pen', label: 'Armor Penetration', short: 'PEN', color: '#9a5fe0' },
  NonbootsMovement: { id: 'ms', label: 'Move Speed', short: 'MS', color: '#5f9ae0' },
  Tenacity: { id: 'tenacity', label: 'Tenacity', short: 'TEN', color: '#c98a4f' },
}

// Deduped list of every stat category an item can carry, for filter UIs.
export const ALL_STAT_CATEGORIES: StatCategory[] = [...new Map(Object.values(CATEGORY_BY_RAW_TAG).map((c) => [c.id, c])).values()]

export function getAutoStatTags(rawTags: string[]): StatCategory[] {
  const byId = new Map<string, StatCategory>()
  for (const raw of rawTags) {
    const category = CATEGORY_BY_RAW_TAG[raw]
    if (category) byId.set(category.id, category)
  }
  if (rawTags.includes('Boots') && !byId.has('ms')) {
    byId.set('ms', CATEGORY_BY_RAW_TAG.NonbootsMovement)
  }
  return [...byId.values()]
}
