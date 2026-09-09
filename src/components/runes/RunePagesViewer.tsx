import { useState } from 'react'
import { useGameData } from '../../state/GameDataContext'
import type { RunePage } from '../../types/runes'
import { groupRunePages } from '../../lib/runeRules'
import { RuneTreeColumn } from './RuneTreeColumn'
import { StatShardRow } from './StatShardRow'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'
import { treeAccentColor } from '../../lib/runeTreeColors'
import { OFFENSE_SHARDS, FLEX_SHARDS, DEFENSE_SHARDS } from '../../data/statShards'

export function RunePagesViewer({ pages }: { pages: RunePage[] }) {
  const { runeTrees } = useGameData()
  const groups = groupRunePages(pages)
  const [selectedKeystoneId, setSelectedKeystoneId] = useState<number | null>(null)

  if (runeTrees.length === 0) return null
  if (groups.length === 0) {
    return <div style={{ color: 'var(--text-dim)' }}>No rune pages yet.</div>
  }

  const activeGroup = groups.find((g) => g.keystoneId === selectedKeystoneId) ?? groups[0]
  const primaryTree = runeTrees.find((t) => t.id === activeGroup.primaryTreeId)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {groups.map((group) => {
          const tree = runeTrees.find((t) => t.id === group.primaryTreeId)
          const keystone = tree?.slots[0]?.runes.find((r) => r.id === group.keystoneId)
          if (!tree || !keystone) return null
          const selected = group.keystoneId === activeGroup.keystoneId
          return (
            <Tooltip key={group.keystoneId} title={keystone.name}>
              <button
                type="button"
                onClick={() => setSelectedKeystoneId(group.keystoneId)}
                style={{
                  border: selected ? '3px solid var(--gold)' : '1px solid var(--border-strong)',
                  borderRadius: '50%',
                  padding: 5,
                  background: selected ? 'var(--bg-panel-raised)' : 'var(--bg-panel)',
                  boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                }}
              >
                <img src={runeIconUrl(keystone.icon)} alt={keystone.name} width={38} height={38} style={{ borderRadius: '50%' }} />
              </button>
            </Tooltip>
          )
        })}
      </div>

      {primaryTree && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <RuneTreeColumn
            tree={primaryTree}
            mode="primary"
            keystoneId={activeGroup.keystoneId}
            preferredKeystone={activeGroup.preferredKeystone}
            selectedRuneIds={activeGroup.primaryRuneIds}
            preferredRuneIds={activeGroup.preferredPrimaryRuneIds}
            readOnly
            accentColor={treeAccentColor(primaryTree.key)}
          />
          {activeGroup.secondaryTrees.map(({ treeId, runeIds, preferredRuneIds, shards, preferredShards }) => {
            const tree = runeTrees.find((t) => t.id === treeId)
            if (!tree) return null
            const accentColor = treeAccentColor(tree.key)
            return (
              <RuneTreeColumn
                key={treeId}
                tree={tree}
                mode="secondary"
                selectedRuneIds={runeIds}
                preferredRuneIds={preferredRuneIds}
                readOnly
                accentColor={accentColor}
                extra={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-start' }}>
                    <StatShardRow
                      options={OFFENSE_SHARDS}
                      selectedIds={shards.offense}
                      preferredIds={preferredShards.offense}
                      readOnly
                      accentColor={accentColor}
                    />
                    <StatShardRow
                      options={FLEX_SHARDS}
                      selectedIds={shards.flex}
                      preferredIds={preferredShards.flex}
                      readOnly
                      accentColor={accentColor}
                    />
                    <StatShardRow
                      options={DEFENSE_SHARDS}
                      selectedIds={shards.defense}
                      preferredIds={preferredShards.defense}
                      readOnly
                      accentColor={accentColor}
                    />
                  </div>
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
