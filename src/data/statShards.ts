export interface StatShardOption {
  id: number
  name: string
  icon: string
}

export const OFFENSE_SHARDS: StatShardOption[] = [
  { id: 5008, name: 'Adaptive Force', icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png' },
  { id: 5005, name: 'Attack Speed', icon: 'perk-images/StatMods/StatModsAttackSpeedIcon.png' },
  { id: 5007, name: 'Ability Haste', icon: 'perk-images/StatMods/StatModsCDRScalingIcon.png' },
]

export const FLEX_SHARDS: StatShardOption[] = [
  { id: 5008, name: 'Adaptive Force', icon: 'perk-images/StatMods/StatModsAdaptiveForceIcon.png' },
  { id: 5010, name: 'Move Speed', icon: 'perk-images/StatMods/StatModsMovementSpeedIcon.png' },
  { id: 5001, name: 'Health Scaling', icon: 'perk-images/StatMods/StatModsHealthPlusIcon.png' },
]

export const DEFENSE_SHARDS: StatShardOption[] = [
  { id: 5011, name: 'Health', icon: 'perk-images/StatMods/StatModsHealthScalingIcon.png' },
  { id: 5013, name: 'Tenacity and Slow Resist', icon: 'perk-images/StatMods/StatModsTenacityIcon.png' },
  { id: 5001, name: 'Health Scaling', icon: 'perk-images/StatMods/StatModsHealthPlusIcon.png' },
]
