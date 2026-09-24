import { useEffect, useState } from 'react'
import type { SkillKey } from '../../types/build'
import type { DDragonRuneTree } from '../../types/ddragon'
import type { ChampionSimData, DamageType, SimSpell, StatBlock, TargetStats } from '../../types/simulator'
import { passiveImageUrl, runeIconUrl, summonerSpellImageUrl } from '../../lib/ddragon'
import { adaptiveDamageType, isRanged, mitigate, runeInputValue } from '../../lib/statEngine'
import { formatNumber, perRank, renderTooltip, type CalcContext } from '../../lib/spellCalc'
import { RUNE_AMPS, RUNE_DAMAGE } from '../../lib/runeEffects'
import { findRune } from '../../lib/simulatorLoadout'
import { Tooltip } from '../shared/Tooltip'

// Tracks whether Shift is held, the same key the game uses for its extended tooltips.
function useShiftKey(): boolean {
  const [held, setHeld] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === 'Shift' && setHeld(true)
    const up = (e: KeyboardEvent) => e.key === 'Shift' && setHeld(false)
    const blur = () => setHeld(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
  return held
}

const DAMAGE_COLORS: Record<DamageType, string> = { physical: '#ff8c34', magic: '#4fb3ff', true: '#ffffff' }
const RESOURCE_NAMES: Record<number, string> = { 0: 'Mana', 1: 'Energy' }
const KEYS: SkillKey[] = ['Q', 'W', 'E', 'R']

interface Props {
  data: ChampionSimData
  block: StatBlock
  ranks: Record<SkillKey, number>
  onRankChange: (key: SkillKey, rank: number) => void
  stacks: Record<string, number>
  onStacksChange: (key: string, stacks: number) => void
  target: TargetStats
  runeIds: number[]
  runeInputs: Record<number, number>
  trees: DDragonRuneTree[]
  enabledAmps: number[]
  onToggleAmp: (runeId: number) => void
}

function DamageSummary({ raw, post, type, targetHp }: { raw: number; post: number; type: DamageType; targetHp: number }) {
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span style={{ color: DAMAGE_COLORS[type] }}>{formatNumber(raw)} {type}</span>
      <span style={{ color: 'var(--text-dim)' }}> → </span>
      <strong>{formatNumber(post)}</strong>
      <span style={{ color: 'var(--text-dim)' }}> ({formatNumber((post / targetHp) * 100)}% HP)</span>
    </span>
  )
}

export function AbilityList({ data, block, ranks, onRankChange, stacks, onStacksChange, target, runeIds, runeInputs, trees, enabledAmps, onToggleAmp }: Props) {
  const shift = useShiftKey()
  const level = block.level
  const availableAmps = runeIds.filter((id) => RUNE_AMPS[id])
  const ampMultiplier = (ultimate: boolean) =>
    enabledAmps
      .filter((id) => runeIds.includes(id) && RUNE_AMPS[id] && (!RUNE_AMPS[id].ultimateOnly || ultimate))
      .reduce((m, id) => m * (1 + RUNE_AMPS[id].percent(level) / 100), 1)

  const spells: { key: SkillKey | 'P'; spell: SimSpell; icon: string }[] = [
    { key: 'P', spell: data.passive, icon: passiveImageUrl(data.passive.icon) },
    ...data.spells.map((spell, i) => ({ key: KEYS[i], spell, icon: summonerSpellImageUrl(spell.icon) })),
  ]
  const contextFor = (key: SkillKey | 'P', spell: SimSpell): CalcContext => {
    const rank = key === 'P' ? 1 : Math.max(ranks[key], 1)
    const haste = block.stats.ah.total + (key === 'R' ? block.ultimateHaste : key === 'P' ? 0 : block.basicAbilityHaste)
    return { spell, rank, level, block, stacks: stacks[key] ?? 0, haste }
  }
  const sibling = (scriptName: string) => {
    const match = spells.find((s) => s.spell.scriptName?.toLowerCase() === scriptName.toLowerCase())
    return match ? contextFor(match.key, match.spell) : undefined
  }

  const damageCtx = {
    level,
    ranged: isRanged(data),
    bonusAd: block.stats.ad.bonus,
    ap: block.stats.ap.total,
    maxHp: block.stats.hp.total,
    bonusHp: block.stats.hp.bonus,
    bonusAsPct: block.stats.as.bonus,
  }
  const runeDamages = runeIds
    .filter((id) => RUNE_DAMAGE[id])
    .map((id) => {
      const def = RUNE_DAMAGE[id]
      const type = def.type === 'adaptive' ? adaptiveDamageType(block) : def.type
      const raw = def.amount(damageCtx, runeInputValue(def, runeInputs, id))
      return { id, label: def.label, type, raw, post: mitigate(raw, type, block, target) * ampMultiplier(false) }
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        Hover an ability for its tooltip. Hold <kbd>Shift</kbd> to see the scalings instead of totals. {shift && <strong style={{ color: 'var(--gold-bright)' }}>Shift held</strong>}
      </div>
      {availableAmps.length > 0 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5 }}>
          {availableAmps.map((id) => (
            <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input type="checkbox" checked={enabledAmps.includes(id)} onChange={() => onToggleAmp(id)} />
              {RUNE_AMPS[id].label}
            </label>
          ))}
        </div>
      )}
      {spells.map(({ key, spell, icon }) => {
        const ctx = contextFor(key, spell)
        const ult = key === 'R'
        const mult = ampMultiplier(ult)
        const post = (raw: number, type: DamageType) => mitigate(raw, type, block, target) * mult
        const rendered = renderTooltip(spell.tooltip, ctx, shift, post, sibling)
        const rules = shift && spell.tooltipExtended ? renderTooltip(spell.tooltipExtended, ctx, true, undefined, sibling).html : ''
        const rank = key === 'P' ? 1 : ranks[key]
        const cooldown = perRank(spell.cooldown, ctx.rank)
        const cost = perRank(spell.cost, ctx.rank)
        const usesStacks = JSON.stringify(spell.calculations).includes('BuffCounter')
        const tooltipBody = (
          <div className="sim-text" style={{ color: 'var(--text)', fontSize: 13 }}>
            <div dangerouslySetInnerHTML={{ __html: rendered.html }} />
            {rules && <div dangerouslySetInnerHTML={{ __html: rules }} />}
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-dim)' }}>
              {shift ? 'Showing scalings' : 'Hold Shift for scalings'} · rank {ctx.rank} · level {level}
            </div>
          </div>
        )
        return (
          <div key={key} className={`sim-ability${key !== 'P' && rank === 0 ? ' unlearned' : ''}`}>
            <Tooltip title={`${spell.name}${key === 'P' ? ' (Passive)' : ` [${key}]`}`} extra={tooltipBody}>
              <img src={icon} alt={spell.name} width={48} height={48} style={{ borderRadius: 6, border: '1px solid var(--border-strong)', display: 'block' }} />
            </Tooltip>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong>{spell.name}</strong>
                <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{key === 'P' ? 'Passive' : key}</span>
                {rendered.unknown && (
                  <span title="Part of this tooltip uses values the simulator can't compute — shown as ?" style={{ color: 'var(--danger)', fontSize: 12 }}>
                    ⚠ partial
                  </span>
                )}
                {key !== 'P' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginLeft: 'auto' }}>
                    <button type="button" className="sim-small-button" disabled={rank <= 0} onClick={() => onRankChange(key, rank - 1)}>
                      −
                    </button>
                    Rank {rank}/{spell.maxRank}
                    <button type="button" className="sim-small-button" disabled={rank >= spell.maxRank} onClick={() => onRankChange(key, rank + 1)}>
                      +
                    </button>
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {!!cooldown && <span>Cooldown {formatNumber((cooldown * 100) / (100 + ctx.haste))}s{ctx.haste > 0 && ` (${formatNumber(cooldown)}s base)`}</span>}
                {!!cost && <span>Cost {formatNumber(cost)} {RESOURCE_NAMES[data.stats.resourceType] ?? ''}</span>}
                {usesStacks && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Stacks
                    <input type="number" className="sim-number-input" min={0} value={stacks[key] ?? 0} onChange={(e) => onStacksChange(key, Math.max(0, Number(e.target.value) || 0))} />
                  </label>
                )}
              </div>
              {rendered.damages.length > 0 && (
                <div style={{ fontSize: 12.5, display: 'flex', flexWrap: 'wrap', gap: '2px 14px' }}>
                  {rendered.damages.map((d, i) => (
                    <DamageSummary key={i} raw={d.raw} post={post(d.raw, d.type)} type={d.type} targetHp={target.hp} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {runeDamages.length > 0 && (
        <div className="sim-ability" style={{ flexDirection: 'column', gap: 6 }}>
          <strong style={{ fontSize: 13 }}>Rune damage</strong>
          {runeDamages.map((r) => {
            const rune = findRune(trees, r.id)
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                {rune && <img src={runeIconUrl(rune.icon)} alt="" width={22} height={22} />}
                <span style={{ minWidth: 200 }}>{r.label}</span>
                <DamageSummary raw={r.raw} post={r.post} type={r.type} targetHp={target.hp} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
