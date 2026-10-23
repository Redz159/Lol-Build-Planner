import { STAT_CATEGORIES, statCategoryForLabel, statLineLabel } from './itemStatTags'

// The game's own text icons (the stat ones are what the shop and the stats panel use).
const TEXT_ICON_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/ux/fonts/texticons/lol'

export function statIconUrl(icon: string): string {
  return `${TEXT_ICON_BASE}/${icon}.png`
}

// Champion stats no item grants, so they have no StatCategory of their own.
const CHAMPION_STAT_ICONS: Record<string, string> = {
  range: 'statsicon/scalerange',
}

export function statCategoryIconUrl(categoryId: string): string {
  return statIconUrl(STAT_CATEGORIES.find((c) => c.id === categoryId)?.icon ?? CHAMPION_STAT_ICONS[categoryId] ?? 'statsicon/scalems')
}

// Puts the matching stat icon in front of each line of the tooltip's <stats> block, like the
// in-game shop does: "<attention>75</attention> Attack Damage" gets the AD icon.
export function addStatIconsToDescription(description: string): string {
  return description.replace(/<stats>(.*?)<\/stats>/, (_, block: string) => {
    const lines = block.split(/(<br\s*\/?>)/).map((line) => {
      const label = statLineLabel(line)
      const category = label ? statCategoryForLabel(label) : undefined
      return category ? `<img class="tooltip-stat-icon" src="${statIconUrl(category.icon)}" alt="">${line}` : line
    })
    return `<stats>${lines.join('')}</stats>`
  })
}
