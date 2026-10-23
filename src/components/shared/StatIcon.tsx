// The game's own stat icons (the ones the shop and the stats panel use), keyed by stat category id.
const ICON_FILES: Record<string, string> = {
  health: 'scalehealth',
  healthregen: 'scalehpregen',
  mana: 'scalemana',
  manaregen: 'scalemanaregen',
  armor: 'scalearmor',
  mr: 'scalemr',
  ad: 'scalead',
  ap: 'scaleap',
  as: 'scaleas',
  crit: 'scalecrit',
  lifesteal: 'scalels',
  omnivamp: 'scalesv',
  ah: 'scaleah',
  pen: 'scaleapen',
  ms: 'scalems',
  tenacity: 'scaletenacity',
}

const ICON_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/ux/fonts/texticons/lol/statsicon'

export function StatIcon({ id, size = 14 }: { id: string; size?: number }) {
  return <img src={`${ICON_BASE}/${ICON_FILES[id] ?? 'scalems'}.png`} alt="" width={size} height={size} style={{ flexShrink: 0 }} />
}
