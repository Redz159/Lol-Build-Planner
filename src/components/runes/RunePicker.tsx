import { useGameData } from '../../state/GameDataContext'
import type { RuneSelection } from '../../types/runes'
import { RuneTreeSelector } from './RuneTreeSelector'
import { RuneTreeColumn } from './RuneTreeColumn'
import { StatShardRow } from './StatShardRow'
import {
  selectPrimaryTree,
  selectKeystone,
  selectPrimaryRune,
  selectSecondaryTree,
  selectSecondaryRune,
  selectShard,
} from '../../lib/runeRules'
import { OFFENSE_SHARDS, FLEX_SHARDS, DEFENSE_SHARDS } from '../../data/statShards'

interface Props {
  value: RuneSelection
  onChange: (next: RuneSelection) => void
}

export function RunePicker({ value, onChange }: Props) {
  const { runeTrees } = useGameData()
  if (runeTrees.length === 0) return null

  const primaryTree = runeTrees.find((t) => t.id === value.primaryTreeId)
  const secondaryTree = runeTrees.find((t) => t.id === value.secondaryTreeId)

  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
        <div>
          <div>Primary</div>
          <RuneTreeSelector
            runeTrees={runeTrees}
            selectedId={value.primaryTreeId}
            onSelect={(id) => onChange(selectPrimaryTree(value, id))}
          />
        </div>
        <div>
          <div>Secondary</div>
          <RuneTreeSelector
            runeTrees={runeTrees}
            selectedId={value.secondaryTreeId}
            disabledId={value.primaryTreeId}
            onSelect={(id) => onChange(selectSecondaryTree(value, id))}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {primaryTree && (
          <RuneTreeColumn
            tree={primaryTree}
            mode="primary"
            keystoneId={value.keystoneId}
            selectedRuneIds={value.primaryRuneIds}
            onSelectKeystone={(id) => onChange(selectKeystone(value, id))}
            onSelectRune={(rowIndex, id) =>
              onChange(selectPrimaryRune(value, primaryTree, rowIndex, id))
            }
          />
        )}
        {secondaryTree && (
          <RuneTreeColumn
            tree={secondaryTree}
            mode="secondary"
            selectedRuneIds={value.secondaryRuneIds}
            onSelectRune={(rowIndex, id) =>
              onChange(selectSecondaryRune(value, secondaryTree, rowIndex, id))
            }
          />
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <div>Stat shards</div>
        <StatShardRow
          options={OFFENSE_SHARDS}
          selectedId={value.shards.offense}
          onSelect={(id) => onChange(selectShard(value, 'offense', id))}
        />
        <StatShardRow
          options={FLEX_SHARDS}
          selectedId={value.shards.flex}
          onSelect={(id) => onChange(selectShard(value, 'flex', id))}
        />
        <StatShardRow
          options={DEFENSE_SHARDS}
          selectedId={value.shards.defense}
          onSelect={(id) => onChange(selectShard(value, 'defense', id))}
        />
      </div>
    </div>
  )
}
