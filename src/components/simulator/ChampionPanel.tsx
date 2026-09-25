import type { ReactNode } from 'react'
import type { DDragonItem, DDragonRuneTree } from '../../types/ddragon'
import type { RunePage } from '../../types/runes'
import type { StatBlock } from '../../types/simulator'
import { championLoadingUrl } from '../../lib/ddragon'
import type { ResolvedRunes, RunePicks } from '../../lib/simulatorLoadout'
import { ItemLoadoutPicker, type ItemSource } from './ItemLoadoutPicker'
import { ItemsDropdown, RunesDropdown } from './LoadoutDropdowns'
import { RuneLoadoutPicker } from './RuneLoadoutPicker'
import { StatSheet } from './StatSheet'

interface Props {
  championId: string
  // The champion's name, or a picker for it on the target side.
  title: ReactNode
  level: number
  onLevelChange: (level: number) => void
  block?: StatBlock
  resourceType: number
  error?: string
  allItems: DDragonItem[]
  itemIds: string[]
  onItemsChange: (ids: string[]) => void
  itemSource?: ItemSource
  trees: DDragonRuneTree[]
  runePages: RunePage[]
  runePicks: RunePicks
  resolvedRunes: ResolvedRunes
  onRunePicksChange: (picks: RunePicks) => void
  // The right-hand side is drawn as a mirror image of the left: portrait and runes on the outer
  // edge, everything else lined up toward it, and dropdowns opening inward.
  mirrored?: boolean
}

// One champion's loadout: portrait with its rune page below, and next to it the level, stats and
// items. Used for both your side and a target champion so the two read the same way.
export function ChampionPanel(props: Props) {
  const { block, mirrored } = props
  const align = mirrored ? 'right' : 'left'
  const edge = mirrored ? 'flex-end' : 'flex-start'
  const items = props.itemIds.map((id) => props.allItems.find((i) => i.id === id)).filter((i): i is DDragonItem => !!i)
  return (
    <div className="sim-panel" style={{ display: 'flex', flexDirection: mirrored ? 'row-reverse' : 'row', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 150, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <img src={championLoadingUrl(props.championId)} alt="" width={150} style={{ borderRadius: 8, border: '1px solid var(--border-strong)', display: 'block' }} />
        <RunesDropdown
          layout="page"
          mirrored={mirrored}
          align={align}
          resolved={props.resolvedRunes}
          trees={props.trees}
          editor={<RuneLoadoutPicker pages={props.runePages} trees={props.trees} picks={props.runePicks} resolved={props.resolvedRunes} onChange={props.onRunePicksChange} />}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: mirrored ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', minHeight: 32 }}>
          {props.title}
          {block && <span className="sim-heading" style={{ margin: 0 }}>· adaptive {block.adaptive.toUpperCase()} ·</span>}
          <label className="sim-heading" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
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
        {props.error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{props.error}</div>}
        {block ? <StatSheet block={block} resourceType={props.resourceType} mirrored={mirrored} /> : !props.error && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading champion data...</div>}
        <div style={{ alignSelf: edge }}>
          <ItemsDropdown
            align={align}
            items={items}
            editor={<ItemLoadoutPicker allItems={props.allItems} selected={props.itemIds} onChange={props.onItemsChange} source={props.itemSource} />}
          />
        </div>
      </div>
    </div>
  )
}
