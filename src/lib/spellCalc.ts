import type { DamageType, SimSpell, StatBlock } from '../types/simulator'

// Interprets the game's own mSpellCalculations trees (as extracted by CommunityDragon) into a
// number plus a "base + scalings" breakdown for the Shift view. Anything the evaluator doesn't
// understand makes the result `unknown` rather than silently producing a wrong number.

export interface ScalingTerm {
  key: string
  label: string
  // CSS class (the game's own tooltip tag names) the term is colored with.
  cls: string
  coef: number
  // coef × the stat's current value.
  value: number
}

export interface Linear {
  base: number
  terms: ScalingTerm[]
  unknown?: boolean
}

export const linValue = (l: Linear) => l.base + l.terms.reduce((sum, t) => sum + t.value, 0)
const constant = (base: number, unknown?: boolean): Linear => ({ base, terms: [], ...(unknown ? { unknown } : {}) })
const UNKNOWN = constant(0, true)

function add(a: Linear, b: Linear): Linear {
  const terms = a.terms.map((t) => ({ ...t }))
  for (const t of b.terms) {
    const same = terms.find((x) => x.key === t.key)
    if (same) {
      same.coef += t.coef
      same.value += t.value
    } else terms.push({ ...t })
  }
  return { base: a.base + b.base, terms, unknown: a.unknown || b.unknown }
}

function scale(a: Linear, k: number): Linear {
  return { base: a.base * k, terms: a.terms.map((t) => ({ ...t, coef: t.coef * k, value: t.value * k })), unknown: a.unknown }
}

// Keeps the breakdown when one side is a plain number; otherwise collapses to the product value.
function mul(a: Linear, b: Linear): Linear {
  if (a.terms.length === 0) return { ...scale(b, a.base), unknown: a.unknown || b.unknown }
  if (b.terms.length === 0) return { ...scale(a, b.base), unknown: a.unknown || b.unknown }
  return constant(linValue(a) * linValue(b), a.unknown || b.unknown)
}

const collapse = (a: Linear, f: (v: number) => number): Linear => constant(f(linValue(a)), a.unknown)

// mStat ids, pinned down by checking each against spells with known scalings (Ahri Q = AP,
// Ornn E = armor + MR, Nilah Q = crit chance, Garen E = crit damage, Pyke = lethality, ...).
const STATS: Record<number, { label: string; cls: string; get: (b: StatBlock, formula: number) => number }> = {
  0: { label: 'AP', cls: 'scaleAP', get: (b) => b.stats.ap.total },
  1: { label: 'Armor', cls: 'scaleArmor', get: (b, f) => pick(b.stats.armor, f) },
  2: { label: 'AD', cls: 'scaleAD', get: (b, f) => pick(b.stats.ad, f) },
  4: { label: 'Attack Speed', cls: 'scaleAS', get: (b, f) => (f === 2 ? b.stats.as.bonus / 100 : f === 1 ? b.stats.as.base : b.stats.as.total) },
  6: { label: 'Magic Resist', cls: 'scaleMR', get: (b, f) => pick(b.stats.mr, f) },
  7: { label: 'Move Speed', cls: 'speed', get: (b, f) => pick(b.stats.ms, f) },
  8: { label: 'Critical Strike Chance', cls: 'scaleCrit', get: (b) => b.stats.crit.total / 100 },
  9: { label: 'Critical Strike Damage', cls: 'scaleCrit', get: (b, f) => (f === 2 ? b.stats.critDamage.bonus : b.stats.critDamage.total) / 100 },
  12: { label: 'max Health', cls: 'scaleHealth', get: (b, f) => pick(b.stats.hp, f) },
  14: { label: 'current Health', cls: 'scaleHealth', get: (b) => b.stats.hp.total },
  16: { label: 'missing Health', cls: 'scaleHealth', get: () => 0 },
  18: { label: 'Life Steal', cls: 'scaleLS', get: (b) => b.stats.lifeSteal.total / 100 },
  29: { label: 'Lethality', cls: 'scaleLethality', get: (b) => b.stats.lethality.total },
  31: { label: 'Attack Range', cls: 'scaleLevel', get: (b, f) => pick(b.stats.range, f) },
}

function pick(line: { total: number; base: number; bonus: number }, formula: number): number {
  return formula === 1 ? line.base : formula === 2 ? line.bonus : line.total
}

export interface CalcContext {
  spell: SimSpell
  // Index into DataValues arrays (0 = unlearned, 1-5 = ranks).
  rank: number
  level: number
  block: StatBlock
  // Buff-counter stacks the user dialled in for this ability.
  stacks: number
  haste: number
}

type Node = Record<string, unknown> & { __type?: string }

function lookup<T>(record: Record<string, T>, name: string): T | undefined {
  if (name in record) return record[name]
  const lower = name.toLowerCase()
  const key = Object.keys(record).find((k) => k.toLowerCase() === lower)
  return key === undefined ? undefined : record[key]
}

function dataValue(ctx: CalcContext, name: unknown): number | undefined {
  if (typeof name !== 'string') return undefined
  const values = lookup(ctx.spell.dataValues, name)
  if (!values) return undefined
  return values[Math.min(ctx.rank, values.length - 1)]
}

function statTerm(ctx: CalcContext, stat: number, formula: number, coef: number): Linear {
  const def = STATS[stat]
  if (!def) return UNKNOWN
  const label = `${formula === 2 ? 'bonus ' : formula === 1 ? 'base ' : ''}${def.label}`
  return { base: 0, terms: [{ key: `${stat}/${formula}`, label, cls: def.cls, coef, value: coef * def.get(ctx.block, formula) }] }
}

function byLevelLerp(start: number, end: number, level: number): number {
  return start + ((end - start) * (Math.min(level, 18) - 1)) / 17
}

function evalPart(part: Node | undefined, ctx: CalcContext, depth: number): Linear {
  if (!part || depth > 20) return UNKNOWN
  const sub = (p: unknown) => evalPart(p as Node, ctx, depth + 1)
  const dv = (name: unknown) => {
    const v = dataValue(ctx, name)
    return v === undefined ? UNKNOWN : constant(v)
  }
  switch (part.__type) {
    case 'NamedDataValueCalculationPart':
      return dv(part.mDataValue)
    case 'NumberCalculationPart':
      return constant((part.mNumber as number) ?? 0)
    case 'StatByCoefficientCalculationPart':
      return statTerm(ctx, (part.mStat as number) ?? 0, (part.mStatFormula as number) ?? 0, (part.mCoefficient as number) ?? 1)
    case 'StatByNamedDataValueCalculationPart': {
      const coef = dataValue(ctx, part.mDataValue)
      return coef === undefined ? UNKNOWN : statTerm(ctx, (part.mStat as number) ?? 0, (part.mStatFormula as number) ?? 0, coef)
    }
    case 'StatBySubPartCalculationPart': {
      const coef = sub(part.mSubpart)
      const term = statTerm(ctx, (part.mStat as number) ?? 0, (part.mStatFormula as number) ?? 0, 1)
      return mul(term, coef)
    }
    case 'AbilityResourceByCoefficientCalculationPart': {
      const coef = (part.mCoefficient as number) ?? 1
      const max = ctx.block.stats.resource.total
      return { base: 0, terms: [{ key: 'resource', label: 'max Mana', cls: 'scaleMana', coef, value: coef * max }] }
    }
    case 'SumOfSubPartsCalculationPart':
      return ((part.mSubparts as Node[]) ?? []).map(sub).reduce(add, constant(0))
    case 'ProductOfSubPartsCalculationPart':
      return mul(sub(part.mPart1), sub(part.mPart2))
    case 'ClampSubPartsCalculationPart': {
      const sum = ((part.mSubparts as Node[]) ?? []).map(sub).reduce(add, constant(0))
      const floor = part.mFloor as number | null | undefined
      const ceiling = part.mCeiling as number | null | undefined
      return collapse(sum, (v) => Math.min(ceiling ?? Infinity, Math.max(floor ?? -Infinity, v)))
    }
    case 'ByCharLevelInterpolationCalculationPart':
      return constant(byLevelLerp((part.mStartValue as number) ?? 0, (part.mEndValue as number) ?? 0, ctx.level))
    case 'ByCharLevelFormulaCalculationPart': {
      const values = (part.values as number[]) ?? []
      return constant(values[Math.min(ctx.level, values.length - 1)] ?? 0)
    }
    case 'ByCharLevelBreakpointsCalculationPart': {
      let value = (part.mLevel1Value as number) ?? 0
      let perLevel = (part.mInitialBonusPerLevel as number) ?? 0
      const breakpoints = (part.mBreakpoints as Node[]) ?? []
      for (let level = 2; level <= ctx.level; level++) {
        const bp = breakpoints.find((b) => b.mLevel === level)
        if (bp) {
          value += (bp.mAdditionalBonusAtThisLevel as number) ?? 0
          if (typeof bp.mBonusPerLevelAtAndAfter === 'number') perLevel = bp.mBonusPerLevelAtAndAfter
        }
        value += perLevel
      }
      return constant(value)
    }
    // Hash-named variant of the breakpoint part whose amounts are DataValue names.
    case '{4ce08984}': {
      let value = dataValue(ctx, part['{91d404a5}']) ?? 0
      let perLevel = dataValue(ctx, part['{bbd778a2}']) ?? 0
      const breakpoints = (part['{9823b29a}'] as Node[]) ?? []
      for (let level = 2; level <= ctx.level; level++) {
        const bp = breakpoints.find((b) => b.level === level)
        if (bp) {
          value += dataValue(ctx, bp['{ae9b464d}']) ?? 0
          perLevel = dataValue(ctx, bp['{b0d8b2ac}']) ?? perLevel
        }
        value += perLevel
      }
      return constant(value)
    }
    // Hash-named level interpolation between two DataValues.
    case '{ee18a47b}': {
      const start = dataValue(ctx, part['{0589a59c}'])
      const end = dataValue(ctx, part['{0b65bc23}'])
      return start === undefined || end === undefined ? UNKNOWN : constant(byLevelLerp(start, end, ctx.level))
    }
    // Hash-named reference to another calculation of the same spell.
    case '{f3cbe7b2}':
      return evalCalc(ctx, part.mSpellCalculationKey as string, depth + 1)
    case 'EffectValueCalculationPart': {
      const values = ctx.spell.effectAmounts[((part.mEffectIndex as number) ?? 1) - 1]
      return values?.length ? constant(values[Math.min(ctx.rank, values.length - 1)]) : UNKNOWN
    }
    case 'CooldownMultiplierCalculationPart':
      return constant(100 / (100 + ctx.haste))
    case 'BuffCounterByCoefficientCalculationPart':
      return constant(ctx.stacks * ((part.mCoefficient as number) ?? 1))
    case 'BuffCounterByNamedDataValueCalculationPart': {
      const v = dataValue(ctx, part.mDataValue)
      return v === undefined ? UNKNOWN : constant(ctx.stacks * v)
    }
    default:
      return UNKNOWN
  }
}

export interface CalcResult {
  value: Linear
  percent: boolean
}

export function evalCalc(ctx: CalcContext, name: string, depth = 0): Linear {
  return evalCalcFull(ctx, name, depth)?.value ?? UNKNOWN
}

function evalCalcFull(ctx: CalcContext, name: string, depth = 0): CalcResult | undefined {
  const calc = lookup(ctx.spell.calculations, name) as Node | undefined
  if (!calc || depth > 20) return undefined
  const percent = calc.mDisplayAsPercent === true
  switch (calc.__type) {
    case 'GameCalculation': {
      let value = ((calc.mFormulaParts as Node[]) ?? []).map((p) => evalPart(p, ctx, depth + 1)).reduce(add, constant(0))
      if (calc.mMultiplier) value = mul(value, evalPart(calc.mMultiplier as Node, ctx, depth + 1))
      return { value, percent }
    }
    case 'GameCalculationModified': {
      const inner = evalCalcFull(ctx, calc.mModifiedGameCalculation as string, depth + 1)
      if (!inner) return { value: UNKNOWN, percent }
      const multiplier = calc.mMultiplier ? evalPart(calc.mMultiplier as Node, ctx, depth + 1) : constant(1)
      return { value: mul(inner.value, multiplier), percent: percent || inner.percent }
    }
    // Buff-conditional variants: we can't know the buff state, so show the default branch.
    case 'GameCalculationConditional': {
      const inner = evalCalcFull(ctx, (calc.mDefaultGameCalculation ?? calc.mConditionalGameCalculation) as string, depth + 1)
      return inner ?? { value: UNKNOWN, percent }
    }
    default:
      return { value: UNKNOWN, percent }
  }
}

// DataValues are indexed by rank (index 0 = unlearned); cooldown/cost arrays that only have
// six entries start at rank 1 instead.
export function perRank(values: number[], rank: number): number | undefined {
  if (values.length === 0) return undefined
  const index = values.length >= 7 ? rank : rank - 1
  return values[Math.max(0, Math.min(index, values.length - 1))]
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '?'
  const abs = Math.abs(n)
  if (abs >= 10 || Number.isInteger(n)) return String(Math.round(n))
  return String(Math.round(n * 100) / 100)
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function formatLinear(value: Linear, percent: boolean, extended: boolean): string {
  if (value.unknown) return '<span class="sim-unknown" title="This formula uses something the simulator can\'t evaluate">?</span>'
  const f = (n: number) => (percent ? `${formatNumber(n * 100)}%` : formatNumber(n))
  if (!extended || value.terms.length === 0) return f(linValue(value))
  const terms = value.terms
    .filter((t) => t.coef !== 0)
    .map((t) => `<span class="${t.cls}">(+${formatNumber(t.coef * 100)}% ${escapeHtml(t.label)})</span>`)
    .join(' ')
  return `${f(value.base)} ${terms}`
}

export interface DamageInstance {
  name: string
  type: DamageType
  raw: number
}

export interface RenderedTooltip {
  html: string
  damages: DamageInstance[]
  unknown: boolean
}

const DAMAGE_TAGS: Record<string, DamageType> = { magicDamage: 'magic', physicalDamage: 'physical', trueDamage: 'true' }

// Fills in the real in-game tooltip text. Each @Token@ resolves to a spell calculation, a
// DataValue, a legacy EffectNAmount or the spell's cooldown/cost; `extended` (Shift) swaps totals
// for "base (+x% stat)" breakdowns. `postMitigation` turns each damage figure's raw number into
// the damage it actually deals to the target, shown right after the damage tag. `sibling` resolves
// "@spell.GnarQ:MiniTotalDamage@"-style references to another of the champion's spells.
export function renderTooltip(
  text: string | undefined,
  ctx: CalcContext,
  extended: boolean,
  postMitigation?: (raw: number, type: DamageType) => number,
  sibling?: (scriptName: string) => CalcContext | undefined,
): RenderedTooltip {
  const baseCtx = ctx
  if (!text) return { html: '<i>No tooltip text for this ability.</i>', damages: [], unknown: false }
  const damages: DamageInstance[] = []
  let unknown = false

  // "[spell.Script:]Name[.precision][*multiplier]"
  const resolve = (token: string): { value: Linear; percent: boolean } | undefined => {
    const parts = token.match(/^(?:spell\.(\w+):)?([\w{}]+?)(?:\.\d+)?(?:\*(-?[\d.]+))?$/i)
    if (!parts) return undefined
    const ctx = parts[1] ? sibling?.(parts[1]) : baseCtx
    if (!ctx) return undefined
    const name = parts[2]
    const multiplier = parts[3] ? Number(parts[3]) : 1
    const calc = evalCalcFull(ctx, name)
    if (calc) return { value: scale(calc.value, multiplier), percent: calc.percent }
    const dv = dataValue(ctx, name)
    if (dv !== undefined) return { value: constant(dv * multiplier), percent: false }
    const effect = name.match(/^Effect(\d+)Amount$/i)
    if (effect) {
      const values = ctx.spell.effectAmounts[Number(effect[1]) - 1]
      if (values?.length) return { value: constant(values[Math.min(ctx.rank, values.length - 1)] * multiplier), percent: false }
    }
    return undefined
  }

  const replaceTokens = (fragment: string, onValue?: (v: Linear, name: string) => void) =>
    fragment.replace(/@([^@<>]+)@/g, (_m, token: string) => {
      if (/^SpellModifierDescriptionAppend$/i.test(token)) return ''
      const resolved = resolve(token)
      if (!resolved) {
        unknown = true
        return '<span class="sim-unknown" title="Unknown tooltip variable">?</span>'
      }
      if (resolved.value.unknown) unknown = true
      onValue?.(resolved.value, token)
      return formatLinear(resolved.value, resolved.percent, extended)
    })

  let html = text.replace(/%i:[^%]*%/g, '')
  html = html.replace(/<(magicDamage|physicalDamage|trueDamage)>([\s\S]*?)<\/\1>/g, (_m, tag: string, inner: string) => {
    const type = DAMAGE_TAGS[tag]
    const values: Linear[] = []
    const content = replaceTokens(inner, (v, name) => {
      if (v.unknown) return
      values.push(v)
      damages.push({ name, type, raw: linValue(v) })
    })
    const post =
      postMitigation && values.length > 0
        ? `<span class="sim-vs" title="Damage dealt to the target after its resists and your penetration">→ ${values
            .map((v) => formatNumber(postMitigation(linValue(v), type)))
            .join(' / ')}</span>`
        : ''
    return `<${tag}>${content}</${tag}>${post}`
  })
  html = replaceTokens(html)
  return { html, damages, unknown }
}
