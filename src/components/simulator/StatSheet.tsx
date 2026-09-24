import type { StatBlock, StatKey, StatLine } from '../../types/simulator'
import { resistMultiplier } from '../../lib/statEngine'
import { StatIcon } from '../shared/StatIcon'
import { Tooltip } from '../shared/Tooltip'

interface StatDef {
  key: StatKey
  label: string
  icon: string
  color: string
  format: (n: number) => string
  percent?: boolean
}

const int = (n: number) => String(Math.round(n))
const one = (n: number) => (Math.round(n * 10) / 10).toString()
const pct = (n: number) => `${one(n)}%`

const STAT_DEFS: StatDef[] = [
  { key: 'hp', label: 'Health', icon: 'health', color: '#3fa34d', format: int },
  { key: 'hpRegen', label: 'Health Regen /5s', icon: 'healthregen', color: '#3fa34d', format: one },
  { key: 'resource', label: 'Mana', icon: 'mana', color: '#3f7fa3', format: int },
  { key: 'resourceRegen', label: 'Mana Regen /5s', icon: 'manaregen', color: '#3f7fa3', format: one },
  { key: 'ad', label: 'Attack Damage', icon: 'ad', color: '#d9704f', format: int },
  { key: 'ap', label: 'Ability Power', icon: 'ap', color: '#5fa8ff', format: int },
  { key: 'armor', label: 'Armor', icon: 'armor', color: '#c9a227', format: int },
  { key: 'mr', label: 'Magic Resist', icon: 'mr', color: '#8a6fff', format: int },
  { key: 'as', label: 'Attack Speed', icon: 'as', color: '#e0b64f', format: (n) => n.toFixed(3) },
  { key: 'crit', label: 'Crit Chance', icon: 'crit', color: '#e05f5f', format: pct, percent: true },
  { key: 'critDamage', label: 'Crit Damage', icon: 'crit', color: '#e05f5f', format: pct, percent: true },
  { key: 'ms', label: 'Move Speed', icon: 'ms', color: '#5f9ae0', format: int },
  { key: 'range', label: 'Attack Range', icon: 'ms', color: '#8a94a6', format: int },
  { key: 'ah', label: 'Ability Haste', icon: 'ah', color: '#4fc9c0', format: int },
  { key: 'lethality', label: 'Lethality', icon: 'pen', color: '#9a5fe0', format: int },
  { key: 'armorPen', label: 'Armor Pen', icon: 'pen', color: '#9a5fe0', format: pct, percent: true },
  { key: 'magicPenFlat', label: 'Magic Pen', icon: 'pen', color: '#5fa8ff', format: int },
  { key: 'magicPen', label: 'Magic Pen %', icon: 'pen', color: '#5fa8ff', format: pct, percent: true },
  { key: 'lifeSteal', label: 'Life Steal', icon: 'lifesteal', color: '#c9455c', format: pct, percent: true },
  { key: 'omnivamp', label: 'Omnivamp', icon: 'omnivamp', color: '#c9457e', format: pct, percent: true },
  { key: 'tenacity', label: 'Tenacity', icon: 'tenacity', color: '#c98a4f', format: pct, percent: true },
  { key: 'hsp', label: 'Heal & Shield Power', icon: 'health', color: '#3fa34d', format: pct, percent: true },
]

function signed(value: number, percent?: boolean): string {
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded >= 0 ? '+' : ''}${rounded}${percent ? '%' : ''}`
}

function extraNotes(key: StatKey, line: StatLine, block: StatBlock): string[] {
  const hp = block.stats.hp.total
  if (key === 'armor' || key === 'mr') {
    const reduction = (1 - resistMultiplier(line.total)) * 100
    const kind = key === 'armor' ? 'physical' : 'magic'
    return [
      `Reduces ${kind} damage taken by ${one(reduction)}%`,
      `Effective Health vs ${kind} damage: ${int(hp / resistMultiplier(line.total))}`,
    ]
  }
  if (key === 'ah') {
    const notes = [`Cooldown reduction: ${one((line.total / (line.total + 100)) * 100)}%`]
    if (block.basicAbilityHaste) notes.push(`+${one(block.basicAbilityHaste)} basic ability haste (Q/W/E only)`)
    if (block.ultimateHaste) notes.push(`+${one(block.ultimateHaste)} ultimate haste (R only)`)
    return notes
  }
  return []
}

function Breakdown({ def, line, block }: { def: StatDef; line: StatLine; block: StatBlock }) {
  const notes = [...(line.notes ?? []), ...extraNotes(def.key, line, block)]
  return (
    <div className="sim-breakdown">
      {line.sources.length === 0 && <div className="sim-breakdown-note">Nothing grants this yet.</div>}
      {line.sources.map((src, i) => (
        <div key={i} className="sim-breakdown-row">
          {src.iconUrl ? <img src={src.iconUrl} alt="" /> : <span style={{ width: 16 }} />}
          <span style={{ flex: 1 }}>{src.label}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{i === 0 && src.label.startsWith('Base') ? def.format(src.value) : signed(src.value, src.percent)}</span>
        </div>
      ))}
      <div className="sim-breakdown-row sim-breakdown-total">
        <span style={{ flex: 1 }}>Total</span>
        <span>{def.format(line.total)}</span>
      </div>
      {notes.map((note) => (
        <div key={note} className="sim-breakdown-note">
          {note}
        </div>
      ))}
    </div>
  )
}

// resourceType as stored in ChampionBaseStats: 0 = mana, 1 = energy, anything else = none.
export function StatSheet({ block, resourceType }: { block: StatBlock; resourceType: number }) {
  const resourceName = resourceType === 1 ? 'Energy' : resourceType === 0 ? 'Mana' : 'Resource'
  return (
    <div className="sim-stat-grid">
      {STAT_DEFS.map((def) => {
        const line = block.stats[def.key]
        const label = def.key === 'resource' ? resourceName : def.key === 'resourceRegen' ? `${resourceName} Regen /5s` : def.label
        const empty = line.total === 0 && line.sources.length === 0
        return (
          <Tooltip key={def.key} title={label} extra={<Breakdown def={def} line={line} block={block} />}>
            <div className="sim-stat" style={{ opacity: empty ? 0.4 : 1 }}>
              <span style={{ color: def.color, display: 'flex' }}>
                <StatIcon id={def.icon} />
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{label}</span>
              <span className="sim-stat-value">{def.format(line.total)}</span>
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}
