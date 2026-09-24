import type { DamageType, StatKey } from '../types/simulator'

// Hand-maintained rune numbers, read off CommunityDragon's perks.json for patch 16.17 (the
// pinned DDRAGON_VERSION). Re-check against that file whenever the patch is bumped. "X - Y based
// on level" values are interpolated linearly across levels 1-18, which is close to (but not
// exactly) the in-game per-level tables.

export function byLevel(level1: number, level18: number, level: number): number {
  return level1 + ((level18 - level1) * (Math.min(Math.max(level, 1), 18) - 1)) / 17
}

export interface RuneContext {
  level: number
  ranged: boolean
  // Jack Of All Trades counts distinct item stats — computed from the picked items.
  joatStacks: number
}

// 'adaptiveForce' resolves to 0.6 AD or 1 AP per point; 'adaptivePair' carries its own AD and
// AP amounts (Gathering Storm and the collection runes don't use the 0.6 ratio exactly).
export type RuneGrant =
  | { key: StatKey | 'msPct' | 'basicAbilityHaste' | 'ultimateHaste'; value: number }
  | { key: 'adaptiveForce'; value: number }
  | { key: 'adaptivePair'; ad: number; ap: number }
  // Multiplies the stat's total at the end (Conditioning's +3% resists, Overgrowth's +3.5% HP).
  | { key: 'totalPct'; stat: 'hp' | 'armor' | 'mr'; value: number }
  // Celerity: every bonus Move Speed source is this % more effective.
  | { key: 'msBonusAmp'; value: number }

export type RuneInput = { type: 'toggle'; label: string; default: boolean } | { type: 'stacks'; label: string; max: number; default: number }

export interface RuneStatDef {
  input?: RuneInput
  // `value` is the input's current value (1/0 for toggles, the count for stacks), 1 with no input.
  grants: (ctx: RuneContext, value: number) => RuneGrant[]
}

export const SHARD_STATS: Record<number, RuneStatDef> = {
  5008: { grants: () => [{ key: 'adaptiveForce', value: 9 }] },
  5005: { grants: () => [{ key: 'as', value: 10 }] },
  5007: { grants: () => [{ key: 'ah', value: 8 }] },
  5010: { grants: () => [{ key: 'msPct', value: 2.5 }] },
  5001: { grants: (ctx) => [{ key: 'hp', value: byLevel(10, 180, ctx.level) }] },
  5011: { grants: () => [{ key: 'hp', value: 65 }] },
  5013: { grants: () => [{ key: 'tenacity', value: 15 }] },
}

const GATHERING_STORM_AP = [0, 8, 24, 48, 80, 120, 168]
const GATHERING_STORM_AD = [0, 5, 14, 29, 48, 72, 101]

const collectionRune = (label: string, bonusAtMax: RuneGrant): RuneStatDef => ({
  input: { type: 'stacks', label, max: 10, default: 10 },
  grants: (_ctx, stacks) => [{ key: 'adaptivePair', ad: 1.2 * stacks, ap: 2 * stacks }, ...(stacks >= 10 ? [bonusAtMax] : [])],
})

export const RUNE_STATS: Record<number, RuneStatDef> = {
  // Conqueror: 1.8-4 adaptive force per stack, up to 12 stacks.
  8010: {
    input: { type: 'stacks', label: 'Stacks', max: 12, default: 12 },
    grants: (ctx, stacks) => [{ key: 'adaptiveForce', value: byLevel(1.8, 4, ctx.level) * stacks }],
  },
  // Lethal Tempo: 6% (4% ranged) attack speed per stack, up to 6.
  8008: {
    input: { type: 'stacks', label: 'Stacks', max: 6, default: 6 },
    grants: (ctx, stacks) => [{ key: 'as', value: (ctx.ranged ? 4 : 6) * stacks }],
  },
  // Hail of Blades: 90% (60% ranged) attack speed for its 3 attacks.
  9923: {
    input: { type: 'toggle', label: 'Active', default: false },
    grants: (ctx, on) => (on ? [{ key: 'as', value: ctx.ranged ? 60 : 90 }] : []),
  },
  9104: {
    input: { type: 'stacks', label: 'Legend stacks', max: 10, default: 10 },
    grants: (_ctx, stacks) => [{ key: 'as', value: 3 + 1.5 * stacks }],
  },
  9105: {
    input: { type: 'stacks', label: 'Legend stacks', max: 10, default: 10 },
    grants: (_ctx, stacks) => [{ key: 'basicAbilityHaste', value: 1.5 * stacks }],
  },
  9103: {
    input: { type: 'stacks', label: 'Legend stacks', max: 15, default: 15 },
    grants: (_ctx, stacks) => [{ key: 'lifeSteal', value: 0.45 * stacks }, ...(stacks >= 15 ? [{ key: 'hp' as const, value: 85 }] : [])],
  },
  8138: collectionRune('Eyeballs', { key: 'adaptivePair', ad: 6, ap: 10 }),
  8120: collectionRune('Stacks', { key: 'adaptiveForce', value: 10 }),
  8136: collectionRune('Zombie Wards', { key: 'adaptiveForce', value: 10 }),
  8106: {
    input: { type: 'stacks', label: 'Bounty Hunter stacks', max: 5, default: 5 },
    grants: (_ctx, stacks) => [{ key: 'ultimateHaste', value: 6 + 5 * stacks }],
  },
  8210: { grants: (ctx) => [{ key: 'ah', value: (ctx.level >= 5 ? 5 : 0) + (ctx.level >= 8 ? 5 : 0) }] },
  8234: { grants: () => [{ key: 'msPct', value: 1 }, { key: 'msBonusAmp', value: 7 }] },
  8232: {
    input: { type: 'toggle', label: 'In river', default: false },
    grants: (ctx, on) => (on ? [{ key: 'ms', value: 10 }, { key: 'adaptiveForce', value: byLevel(13, 30, ctx.level) }] : []),
  },
  8233: {
    input: { type: 'toggle', label: 'Above 70% HP', default: true },
    grants: (ctx, on) => (on ? [{ key: 'adaptiveForce', value: byLevel(3, 30, ctx.level) }] : []),
  },
  8236: {
    input: { type: 'stacks', label: 'Game minute', max: 60, default: 30 },
    grants: (_ctx, minute) => {
      const step = Math.min(Math.floor(minute / 10), GATHERING_STORM_AP.length - 1)
      return [{ key: 'adaptivePair', ad: GATHERING_STORM_AD[step], ap: GATHERING_STORM_AP[step] }]
    },
  },
  8226: {
    input: { type: 'stacks', label: 'Stacks', max: 10, default: 10 },
    grants: (_ctx, stacks) => [{ key: 'resource', value: 25 * stacks }],
  },
  8316: {
    grants: (ctx) => [
      { key: 'ah', value: ctx.joatStacks },
      ...(ctx.joatStacks >= 10 ? [{ key: 'adaptiveForce' as const, value: 20 }] : ctx.joatStacks >= 5 ? [{ key: 'adaptiveForce' as const, value: 8 }] : []),
    ],
  },
  8472: {
    input: { type: 'toggle', label: 'Converted (4 takedowns)', default: true },
    grants: (_ctx, converted) => (converted ? [{ key: 'adaptivePair', ad: 6, ap: 10 }] : [{ key: 'hp', value: 40 }]),
  },
  8339: { grants: () => [{ key: 'hp', value: 100 }] },
  8345: {
    input: { type: 'stacks', label: 'Biscuits eaten', max: 3, default: 3 },
    grants: (_ctx, stacks) => [{ key: 'hp', value: 30 * stacks }],
  },
  8437: {
    input: { type: 'stacks', label: 'Stacks', max: 100, default: 20 },
    grants: (ctx, stacks) => [{ key: 'hp', value: (ctx.ranged ? 2 : 5) * stacks }],
  },
  8451: {
    input: { type: 'stacks', label: 'Absorbed', max: 120, default: 120 },
    grants: (_ctx, absorbed) => [{ key: 'hp', value: 3 * Math.floor(absorbed / 8) }, ...(absorbed >= 120 ? [{ key: 'totalPct' as const, stat: 'hp' as const, value: 3.5 }] : [])],
  },
  8429: {
    input: { type: 'toggle', label: 'After 12 min', default: true },
    grants: (_ctx, on) =>
      on
        ? [
            { key: 'armor', value: 8 },
            { key: 'mr', value: 8 },
            { key: 'totalPct', stat: 'armor', value: 3 },
            { key: 'totalPct', stat: 'mr', value: 3 },
          ]
        : [],
  },
  8242: {
    input: { type: 'toggle', label: 'Crowd controlled', default: false },
    grants: (_ctx, on) => (on ? [{ key: 'armor', value: 10 }, { key: 'mr', value: 10 }] : []),
  },
  8430: { grants: () => [{ key: 'armor', value: 5 }] },
  8435: { grants: () => [{ key: 'mr', value: 6 }] },
  8453: { grants: () => [{ key: 'hsp', value: 5 }] },
}

export interface DamageContext {
  level: number
  ranged: boolean
  bonusAd: number
  ap: number
  maxHp: number
  bonusHp: number
  bonusAsPct: number
}

export interface RuneDamageDef {
  label: string
  type: DamageType | 'adaptive'
  input?: RuneInput
  amount: (ctx: DamageContext, value: number) => number
}

export const RUNE_DAMAGE: Record<number, RuneDamageDef> = {
  8112: { label: 'Electrocute', type: 'adaptive', amount: (c) => byLevel(70, 240, c.level) + 0.1 * c.bonusAd + 0.05 * c.ap },
  8229: {
    label: 'Arcane Comet (up to 2x at 750 range)',
    type: 'adaptive',
    amount: (c) => byLevel(15, 100, c.level) + 0.05 * c.ap + 0.1 * c.bonusAd,
  },
  8128: {
    label: 'Dark Harvest',
    type: 'adaptive',
    input: { type: 'stacks', label: 'Souls', max: 100, default: 5 },
    amount: (c, souls) => 30 + 11 * souls + 0.1 * c.bonusAd + 0.05 * c.ap,
  },
  8214: { label: 'Summon Aery', type: 'adaptive', amount: (c) => byLevel(10, 50, c.level) + 0.05 * c.ap + 0.1 * c.bonusAd },
  8005: { label: 'Press the Attack proc', type: 'adaptive', amount: (c) => byLevel(40, 160, c.level) },
  8008: {
    label: 'Lethal Tempo (per attack, max stacks)',
    type: 'adaptive',
    amount: (c) => (c.ranged ? byLevel(6, 24, c.level) : byLevel(9, 30, c.level)) * (1 + c.bonusAsPct / 100),
  },
  9923: { label: 'Hail of Blades (per attack)', type: 'true', amount: (c) => byLevel(2, 20, c.level) + 0.12 * c.bonusAd + 0.1 * c.ap },
  8124: { label: 'Predator', type: 'adaptive', amount: (c) => byLevel(20, 180, c.level) + 0.25 * c.bonusAd + 0.15 * c.ap },
  8437: { label: 'Grasp of the Undying', type: 'magic', amount: (c) => 0.035 * c.maxHp * (c.ranged ? 0.4 : 1) },
  8439: { label: 'Aftershock', type: 'magic', amount: (c) => byLevel(25, 120, c.level) + 0.08 * c.bonusHp },
  8992: {
    label: 'Deathfire Touch (4s single-target burn)',
    type: 'magic',
    // 3s at the base rate, then the last second at +75%.
    amount: (c) => (byLevel(3, 12, c.level) + 0.025 * c.ap + 0.07 * c.bonusAd) * 4.75,
  },
  8237: { label: 'Scorch', type: 'magic', amount: (c) => byLevel(20, 40, c.level) },
  8126: { label: 'Cheap Shot', type: 'true', amount: (c) => byLevel(10, 45, c.level) },
  8143: { label: 'Sudden Impact', type: 'true', amount: (c) => byLevel(20, 80, c.level) },
}

// Conditional damage amplifiers — multiply every ability's damage while toggled on.
export interface RuneAmpDef {
  label: string
  percent: (level: number) => number
  ultimateOnly?: boolean
}

export const RUNE_AMPS: Record<number, RuneAmpDef> = {
  8005: { label: 'Press the Attack exposed (+8%)', percent: () => 8 },
  8369: { label: 'First Strike (+7%)', percent: () => 7 },
  8017: { label: 'Cut Down: target above 60% HP (+8%)', percent: () => 8 },
  8014: { label: 'Coup de Grace: target below 40% HP (+8%)', percent: () => 8 },
  8299: { label: 'Last Stand: you at 30% HP (+11%)', percent: () => 11 },
  8224: { label: 'Axiom Arcanist: ultimate (+12%)', percent: () => 12, ultimateOnly: true },
}
