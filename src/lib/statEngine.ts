import type { DDragonItem } from '../types/ddragon'
import type { ChampionSimData, DamageType, StatBlock, StatKey, StatLine, TargetStats } from '../types/simulator'
import { itemImageUrl, runeIconUrl } from './ddragon'
import { ITEM_CONVERSIONS, parseItemStats } from './itemStats'
import { RUNE_STATS, SHARD_STATS, type RuneContext, type RuneGrant, type RuneStatDef } from './runeEffects'
import { joatStatNames } from './joat'

const ALL_STATS: StatKey[] = [
  'hp',
  'hpRegen',
  'resource',
  'resourceRegen',
  'ad',
  'ap',
  'armor',
  'mr',
  'as',
  'ms',
  'range',
  'crit',
  'critDamage',
  'ah',
  'lethality',
  'armorPen',
  'magicPenFlat',
  'magicPen',
  'lifeSteal',
  'omnivamp',
  'tenacity',
  'hsp',
]

export const MAX_ATTACK_SPEED = 2.5

// League's per-level growth curve: each level-up adds a little more than the last, reaching
// exactly base + 17 × growth at level 18.
export function statAtLevel(base: number, growth: number, level: number): number {
  return base + growth * (level - 1) * (0.7025 + 0.0175 * (level - 1))
}

// Move speed soft caps, applied after every flat and percent bonus. The bands join up
// continuously: 415 and 490 raw map to 415 and 475.
export function softCapMoveSpeed(raw: number): number {
  if (raw > 490) return raw * 0.5 + 230
  if (raw > 415) return raw * 0.8 + 83
  if (raw < 220) return raw * 0.5 + 110
  return raw
}

// The share of incoming damage a resist removes. Negative resists amplify damage instead.
export function resistMultiplier(resist: number): number {
  return resist >= 0 ? 100 / (100 + resist) : 2 - 100 / (100 - resist)
}

export interface RuneSelection {
  // Keystone + every primary/secondary rune picked.
  runeIds: number[]
  shardIds: number[]
  // Current value of each rune's input (toggle 1/0 or stack count), keyed by rune id.
  inputs: Record<number, number>
}

export interface ComputeInput {
  champ: ChampionSimData
  level: number
  items: DDragonItem[]
  runes: RuneSelection
  // Rune id -> { name, icon } for the breakdown labels.
  runeInfo: (id: number) => { name: string; icon?: string } | undefined
}

export function runeInputValue(def: RuneStatDef | { input?: RuneStatDef['input'] }, inputs: Record<number, number>, id: number): number {
  if (!def.input) return 1
  return inputs[id] ?? (def.input.type === 'toggle' ? (def.input.default ? 1 : 0) : def.input.default)
}

export function isRanged(champ: ChampionSimData): boolean {
  return champ.stats.range > 300
}

export function computeStats({ champ, level, items, runes, runeInfo }: ComputeInput): StatBlock {
  const s = champ.stats
  const lines = Object.fromEntries(ALL_STATS.map((k) => [k, { total: 0, base: 0, bonus: 0, sources: [] }])) as unknown as Record<StatKey, StatLine>
  const addBase = (key: StatKey, value: number) => {
    if (value === 0) return
    lines[key].base += value
    lines[key].sources.push({ label: `Base (level ${level})`, value })
  }
  const addBonus = (key: StatKey, label: string, value: number, iconUrl?: string, percent?: boolean) => {
    if (value === 0) return
    lines[key].bonus += value
    lines[key].sources.push({ label, value, iconUrl, percent })
  }

  const hasResource = s.resourceType === 0 || s.resourceType === 1
  addBase('hp', statAtLevel(s.hp, s.hpPerLevel, level))
  // Regen is stored per second; the game's stat sheet shows it per 5 seconds.
  addBase('hpRegen', statAtLevel(s.hpRegen, s.hpRegenPerLevel, level) * 5)
  if (hasResource) {
    addBase('resource', statAtLevel(s.resource, s.resourcePerLevel, level))
    addBase('resourceRegen', statAtLevel(s.resourceRegen, s.resourceRegenPerLevel, level) * 5)
  }
  addBase('ad', statAtLevel(s.ad, s.adPerLevel, level))
  addBase('armor', statAtLevel(s.armor, s.armorPerLevel, level))
  addBase('mr', statAtLevel(s.mr, s.mrPerLevel, level))
  addBase('ms', s.moveSpeed)
  addBase('range', s.range)
  addBase('critDamage', 175)
  addBase('as', s.attackSpeed)
  // Per-level attack speed growth counts as bonus attack speed, same as items.
  addBonus('as', `Level ${level} growth`, statAtLevel(0, s.attackSpeedPerLevel, level), undefined, true)

  let msPct = 0
  let msBonusAmp = 0
  let basicAbilityHaste = 0
  let ultimateHaste = 0
  let itemHp = 0
  const msPctSources: { label: string; value: number; iconUrl?: string }[] = []
  const tenacitySources: number[] = []
  const regenPct = { hpRegen: 0, resourceRegen: 0 }

  for (const item of items) {
    const icon = itemImageUrl(item.image.full)
    for (const mod of parseItemStats(item)) {
      if (mod.key === 'msPct') {
        msPct += mod.value
        msPctSources.push({ label: item.name, value: mod.value, iconUrl: icon })
      } else if (mod.key === 'hpRegenPct') {
        regenPct.hpRegen += mod.value
        addBonus('hpRegen', `${item.name} (${mod.value}% base)`, (lines.hpRegen.base * mod.value) / 100, icon)
      } else if (mod.key === 'resourceRegenPct') {
        if (!hasResource) continue
        regenPct.resourceRegen += mod.value
        addBonus('resourceRegen', `${item.name} (${mod.value}% base)`, (lines.resourceRegen.base * mod.value) / 100, icon)
      } else if (mod.key === 'resource' && s.resourceType !== 0) {
        continue
      } else {
        if (mod.key === 'hp') itemHp += mod.value
        if (mod.key === 'tenacity') tenacitySources.push(mod.value)
        const percent = ['as', 'crit', 'critDamage', 'armorPen', 'magicPen', 'lifeSteal', 'omnivamp', 'tenacity', 'hsp'].includes(mod.key)
        addBonus(mod.key, item.name, mod.value, icon, percent)
      }
    }
  }

  // Runes: flat grants now, adaptive ones once the adaptive direction is known.
  const ctx: RuneContext = { level, ranged: isRanged(champ), joatStacks: joatStatNames(items).length }
  const deferred: { label: string; icon?: string; grant: RuneGrant }[] = []
  const applyRune = (id: number, def: RuneStatDef | undefined) => {
    if (!def) return
    const info = runeInfo(id)
    const label = info?.name ?? `Rune ${id}`
    const icon = info?.icon ? runeIconUrl(info.icon) : undefined
    for (const grant of def.grants(ctx, runeInputValue(def, runes.inputs, id))) {
      if (grant.key === 'adaptiveForce' || grant.key === 'adaptivePair' || grant.key === 'totalPct') {
        deferred.push({ label, icon, grant })
      } else if (grant.key === 'msPct') {
        msPct += grant.value
        msPctSources.push({ label, value: grant.value, iconUrl: icon })
      } else if (grant.key === 'msBonusAmp') {
        msBonusAmp += grant.value
      } else if (grant.key === 'basicAbilityHaste') {
        basicAbilityHaste += grant.value
      } else if (grant.key === 'ultimateHaste') {
        ultimateHaste += grant.value
      } else {
        if (grant.key === 'tenacity') tenacitySources.push(grant.value)
        addBonus(grant.key, label, grant.value, icon, ['as', 'lifeSteal', 'tenacity', 'hsp'].includes(grant.key))
      }
    }
  }
  runes.shardIds.forEach((id) => applyRune(id, SHARD_STATS[id]))
  runes.runeIds.forEach((id) => applyRune(id, RUNE_STATS[id]))

  // Item conversions that feed off other stats (bonus HP -> AD, mana -> AP, ...).
  for (const item of items) {
    const conv = ITEM_CONVERSIONS[item.id]
    if (!conv || conv.kind !== 'convert') continue
    const from = {
      bonusHp: lines.hp.bonus,
      itemHp,
      bonusResource: lines.resource.bonus,
      maxResource: lines.resource.base + lines.resource.bonus,
    }[conv.from]
    if (conv.from !== 'bonusHp' && conv.from !== 'itemHp' && s.resourceType !== 0) continue
    addBonus(conv.to, `${item.name} (${conv.percent}% of ${conv.from.replace(/([A-Z])/g, ' $1').toLowerCase()})`, (from * conv.percent) / 100, itemImageUrl(item.image.full))
  }

  // Adaptive: AD if bonus AD beats AP, AP if AP beats bonus AD, the champion's default on a tie.
  const adaptive: 'ad' | 'ap' =
    lines.ad.bonus > lines.ap.bonus ? 'ad' : lines.ap.bonus > lines.ad.bonus ? 'ap' : s.adaptiveApWeight > 0 ? 'ap' : 'ad'
  for (const { label, icon, grant } of deferred) {
    if (grant.key === 'adaptiveForce') {
      addBonus(adaptive, `${label} (${Math.round(grant.value * 10) / 10} adaptive)`, adaptive === 'ad' ? grant.value * 0.6 : grant.value, icon)
    } else if (grant.key === 'adaptivePair') {
      addBonus(adaptive, label, adaptive === 'ad' ? grant.ad : grant.ap, icon)
    }
  }

  // Multipliers on totals come last.
  for (const item of items) {
    const conv = ITEM_CONVERSIONS[item.id]
    if (conv?.kind !== 'multiplyTotal') continue
    const extra = ((lines.ap.base + lines.ap.bonus) * conv.percent) / 100
    lines.ap.bonus += extra
    lines.ap.sources.push({ label: `${item.name} (+${conv.percent}% total)`, value: extra, iconUrl: itemImageUrl(item.image.full) })
  }
  for (const { label, icon, grant } of deferred) {
    if (grant.key !== 'totalPct') continue
    const line = lines[grant.stat]
    const extra = ((line.base + line.bonus) * grant.value) / 100
    line.bonus += extra
    line.sources.push({ label: `${label} (+${grant.value}% total)`, value: extra, iconUrl: icon })
  }

  for (const key of ALL_STATS) lines[key].total = lines[key].base + lines[key].bonus

  // Attack speed: base + ratio × bonus%, capped.
  const as = lines.as
  as.total = Math.min(MAX_ATTACK_SPEED, s.attackSpeed + (s.attackSpeedRatio * as.bonus) / 100)
  as.notes = [
    `${s.attackSpeed.toFixed(3)} base + ${s.attackSpeedRatio.toFixed(3)} ratio × ${as.bonus.toFixed(1)}% bonus`,
    `Capped at ${MAX_ATTACK_SPEED} attacks per second`,
  ]

  // Move speed: (base + flat) × (1 + %), then the soft caps.
  const ms = lines.ms
  const amp = 1 + msBonusAmp / 100
  const flat = ms.bonus * amp
  const multiplier = 1 + (msPct * amp) / 100
  const raw = (s.moveSpeed + flat) * multiplier
  for (const src of msPctSources) ms.sources.push({ ...src, percent: true })
  ms.bonus = raw - s.moveSpeed
  ms.total = softCapMoveSpeed(raw)
  ms.notes = [
    `(${Math.round(s.moveSpeed)} base + ${Math.round(flat)} flat) × ${multiplier.toFixed(3)} = ${Math.round(raw)}`,
    ...(msBonusAmp ? [`Celerity: bonuses are ${msBonusAmp}% more effective`] : []),
    raw !== ms.total ? `Soft capped: ${Math.round(raw)} → ${Math.round(ms.total)}` : 'Soft caps: 80% above 415, 50% above 490, 50% below 220',
  ]

  // Tenacity stacks multiplicatively.
  lines.tenacity.total = 100 * (1 - tenacitySources.reduce((left, t) => left * (1 - t / 100), 1))
  lines.crit.total = Math.min(100, lines.crit.total)

  return { level, adaptive, basicAbilityHaste, ultimateHaste, stats: lines }
}

export function toTargetStats(block: StatBlock): TargetStats {
  const { hp, armor, mr } = block.stats
  return { hp: hp.total, armor: armor.total, bonusArmor: armor.bonus, mr: mr.total, bonusMr: mr.bonus }
}

// Penetration in the game's order: % penetration, then flat (lethality / flat magic pen).
// Penetration can't push a resist below 0, but an already-negative resist stays negative.
export function effectiveResist(type: DamageType, attacker: StatBlock, target: TargetStats): number {
  const a = attacker.stats
  let resist = type === 'physical' ? target.armor : target.mr
  if (resist <= 0) return resist
  const pct = type === 'physical' ? a.armorPen.total : a.magicPen.total
  const flat = type === 'physical' ? a.lethality.total : a.magicPenFlat.total
  resist *= 1 - pct / 100
  return Math.max(0, resist - flat)
}

export function mitigate(raw: number, type: DamageType, attacker: StatBlock, target: TargetStats): number {
  if (type === 'true') return raw
  return raw * resistMultiplier(effectiveResist(type, attacker, target))
}

export function adaptiveDamageType(block: StatBlock): DamageType {
  return block.adaptive === 'ad' ? 'physical' : 'magic'
}
