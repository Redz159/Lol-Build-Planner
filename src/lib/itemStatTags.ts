export interface StatCategory {
  id: string
  label: string
  // Path under CommunityDragon's texticons/lol folder, without extension (see statIcons.ts).
  icon: string
  // The labels this stat goes by in an item's <stats> block, flat and percent alike.
  statLabels: string[]
}

// Every stat a purchasable item can grant, matched against the item's own <stats> block rather
// than Data Dragon's item.tags — the tags are a loose guess (LifeSteal is on items that only heal
// from a passive) and have no entry at all for Lethality, Heal and Shield Power or Crit Damage.
export const STAT_CATEGORIES: StatCategory[] = [
  { id: 'health', label: 'Health', icon: 'statsicon/scalehealth', statLabels: ['Health'] },
  { id: 'healthregen', label: 'Health Regen', icon: 'statsicon/scalehpregen', statLabels: ['Base Health Regen', 'Health Regen per 5 seconds'] },
  { id: 'mana', label: 'Mana', icon: 'statsicon/scalemana', statLabels: ['Mana'] },
  { id: 'manaregen', label: 'Mana Regen', icon: 'statsicon/scalemanaregen', statLabels: ['Base Mana Regen', 'Mana Regen per 5 seconds'] },
  { id: 'armor', label: 'Armor', icon: 'statsicon/scalearmor', statLabels: ['Armor'] },
  { id: 'mr', label: 'Magic Resist', icon: 'statsicon/scalemr', statLabels: ['Magic Resist'] },
  { id: 'ad', label: 'Attack Damage', icon: 'statsicon/scalead', statLabels: ['Attack Damage'] },
  { id: 'ap', label: 'Ability Power', icon: 'statsicon/scaleap', statLabels: ['Ability Power'] },
  { id: 'as', label: 'Attack Speed', icon: 'statsicon/scaleas', statLabels: ['Attack Speed'] },
  { id: 'crit', label: 'Critical Strike Chance', icon: 'statsicon/scalecrit', statLabels: ['Critical Strike Chance'] },
  { id: 'critdamage', label: 'Critical Strike Damage', icon: 'statsicon/scalecritmult', statLabels: ['Critical Strike Damage'] },
  { id: 'lifesteal', label: 'Life Steal', icon: 'statsicon/scalels', statLabels: ['Life Steal'] },
  { id: 'omnivamp', label: 'Omnivamp', icon: 'statsicon/scalesv', statLabels: ['Omnivamp'] },
  { id: 'ah', label: 'Ability Haste', icon: 'statsicon/scaleah', statLabels: ['Ability Haste', 'Cooldown Reduction'] },
  { id: 'lethality', label: 'Lethality', icon: 'statsicon/scaleapen', statLabels: ['Lethality'] },
  { id: 'armorpen', label: 'Armor Penetration', icon: 'statsicon/scaleapen', statLabels: ['Armor Penetration'] },
  { id: 'magicpen', label: 'Magic Penetration', icon: 'statsicon/scalempen', statLabels: ['Magic Penetration'] },
  { id: 'ms', label: 'Move Speed', icon: 'statsicon/scalems', statLabels: ['Move Speed'] },
  { id: 'tenacity', label: 'Tenacity', icon: 'statsicon/scaletenacity', statLabels: ['Tenacity'] },
  { id: 'hsp', label: 'Heal and Shield Power', icon: 'statsicon/scalehealshield', statLabels: ['Heal and Shield Power'] },
  { id: 'adaptive', label: 'Adaptive Force', icon: 'statsicon/scaleadaptiveforce', statLabels: ['Adaptive Force'] },
  { id: 'gold', label: 'Gold Per 10 Seconds', icon: 'gameplay/goldcoins', statLabels: ['Gold Per 10 Seconds'] },
]

const CATEGORY_BY_STAT_LABEL = new Map(STAT_CATEGORIES.flatMap((c) => c.statLabels.map((label) => [label, c] as const)))

// One line of a <stats> block, e.g. "<attention>25%</attention> Attack Speed" -> "Attack Speed".
export function statLineLabel(line: string): string | undefined {
  return line
    .replace(/<[^>]+>/g, '')
    .trim()
    .match(/^[\d.]+%?\s+(.+)$/)?.[1]
}

export function statCategoryForLabel(label: string): StatCategory | undefined {
  return CATEGORY_BY_STAT_LABEL.get(label)
}

export function itemStatCategoryIds(description: string): Set<string> {
  const block = description.match(/<stats>(.*?)<\/stats>/)?.[1] ?? ''
  const ids = new Set<string>()
  for (const line of block.split(/<br\s*\/?>/)) {
    const label = statLineLabel(line)
    const category = label ? statCategoryForLabel(label) : undefined
    if (category) ids.add(category.id)
  }
  return ids
}
