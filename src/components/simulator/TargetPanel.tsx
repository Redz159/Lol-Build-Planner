import type { DDragonChampion, DDragonItem, DDragonRuneTree } from '../../types/ddragon'
import type { RunePage } from '../../types/runes'
import type { StatBlock } from '../../types/simulator'
import { championImageUrl } from '../../lib/ddragon'
import type { ResolvedRunes, RunePicks } from '../../lib/simulatorLoadout'
import { ChampionSelect } from '../collection/ChampionSelect'
import { ItemLoadoutPicker, type ItemSource } from './ItemLoadoutPicker'
import { ItemsDropdown, RunesDropdown } from './LoadoutDropdowns'
import { RuneLoadoutPicker } from './RuneLoadoutPicker'
import { StatSheet } from './StatSheet'

export interface DummyStats {
  hp: number
  armor: number
  mr: number
}

export type TargetMode = 'dummy' | 'champion'

interface Props {
  mode: TargetMode
  onModeChange: (mode: TargetMode) => void
  dummy: DummyStats
  onDummyChange: (dummy: DummyStats) => void
  champions: DDragonChampion[]
  championId: string
  onChampionChange: (id: string) => void
  level: number
  onLevelChange: (level: number) => void
  allItems: DDragonItem[]
  items: DDragonItem[]
  itemIds: string[]
  onItemsChange: (ids: string[]) => void
  itemSource?: ItemSource
  runePages: RunePage[]
  trees: DDragonRuneTree[]
  runePicks: RunePicks
  resolvedRunes: ResolvedRunes
  onRunePicksChange: (picks: RunePicks) => void
  block?: StatBlock
  resourceType?: number
  loadError?: string
}

const DUMMY_FIELDS: { key: keyof DummyStats; label: string }[] = [
  { key: 'hp', label: 'Health' },
  { key: 'armor', label: 'Armor' },
  { key: 'mr', label: 'Magic Resist' },
]

export function TargetPanel(props: Props) {
  const { mode, onModeChange, dummy, onDummyChange } = props
  const champion = props.champions.find((c) => c.id === props.championId)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['dummy', 'champion'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            style={m === mode ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' } : undefined}
          >
            {m === 'dummy' ? 'Practice dummy' : 'Champion'}
          </button>
        ))}
      </div>

      {mode === 'dummy' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DUMMY_FIELDS.map(({ key, label }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ width: 100, color: 'var(--text-dim)' }}>{label}</span>
              <input
                type="number"
                value={dummy[key]}
                min={key === 'hp' ? 1 : undefined}
                onChange={(e) => onDummyChange({ ...dummy, [key]: Number(e.target.value) || 0 })}
                style={{ width: 100 }}
              />
            </label>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {champion && <img src={championImageUrl(champion.image.full)} alt="" width={36} height={36} style={{ borderRadius: 6 }} />}
            <ChampionSelect champions={props.champions} value={props.championId} onChange={props.onChampionChange} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              Level
              <select className="sim-level-select" value={props.level} onChange={(e) => props.onLevelChange(Number(e.target.value))}>
                {Array.from({ length: 18 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {props.loadError && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{props.loadError}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ItemsDropdown
              align="right"
              items={props.items}
              editor={<ItemLoadoutPicker allItems={props.allItems} selected={props.itemIds} onChange={props.onItemsChange} source={props.itemSource} />}
            />
            <RunesDropdown
              align="right"
              resolved={props.resolvedRunes}
              trees={props.trees}
              editor={
                <RuneLoadoutPicker pages={props.runePages} trees={props.trees} picks={props.runePicks} resolved={props.resolvedRunes} onChange={props.onRunePicksChange} />
              }
            />
          </div>
          {props.block && <StatSheet block={props.block} resourceType={props.resourceType ?? 0} />}
        </div>
      )}
    </div>
  )
}
