import { useState } from 'react'
import { useGameData } from '../../state/GameDataContext'
import type { RunePage, ShardSelection } from '../../types/runes'
import { groupRunePages } from '../../lib/runeRules'
import { RuneTreeColumn } from './RuneTreeColumn'
import { StatShardRow } from './StatShardRow'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'
import { treeAccentColor } from '../../lib/runeTreeColors'
import { OFFENSE_SHARDS, FLEX_SHARDS, DEFENSE_SHARDS } from '../../data/statShards'

function sameIds(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id))
}

function sameShards(a: ShardSelection, b: ShardSelection): boolean {
  return sameIds(a.offense, b.offense) && sameIds(a.flex, b.flex) && sameIds(a.defense, b.defense)
}

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

      {primaryTree &&
        (() => {
          const secondaryTrees = activeGroup.secondaryTrees
            .map((entry) => ({ ...entry, tree: runeTrees.find((t) => t.id === entry.treeId) }))
            .filter((entry) => Boolean(entry.tree))

          if (secondaryTrees.length === 0) {
            return (
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
              </div>
            )
          }

          // The tree carrying an explicit preferred rune pick leads row one; otherwise just the first one does.
          const leadIndex = Math.max(
            secondaryTrees.findIndex((e) => e.preferredRuneIds.length > 0),
            0,
          )
          const lead = secondaryTrees[leadIndex]
          const rest = secondaryTrees.filter((_, i) => i !== leadIndex)
          const leadAccent = treeAccentColor(lead.tree!.key)

          // Shard rings always use the same neutral color, regardless of which secondary tree they belong to.
          const shardBlock = (shards: ShardSelection, preferredShards: ShardSelection) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-start' }}>
              <StatShardRow
                options={OFFENSE_SHARDS}
                selectedIds={shards.offense}
                preferredIds={preferredShards.offense}
                readOnly
              />
              <StatShardRow
                options={FLEX_SHARDS}
                selectedIds={shards.flex}
                preferredIds={preferredShards.flex}
                readOnly
              />
              <StatShardRow
                options={DEFENSE_SHARDS}
                selectedIds={shards.defense}
                preferredIds={preferredShards.defense}
                readOnly
              />
            </div>
          )

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                <RuneTreeColumn
                  tree={lead.tree!}
                  mode="secondary"
                  selectedRuneIds={lead.runeIds}
                  preferredRuneIds={lead.preferredRuneIds}
                  readOnly
                  accentColor={leadAccent}
                  extra={shardBlock(lead.shards, lead.preferredShards)}
                />
              </div>
              {rest.length > 0 && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {rest.map((entry) => {
                    const accentColor = treeAccentColor(entry.tree!.key)
                    const shardsDiffer = !sameShards(entry.shards, lead.shards)
                    return (
                      <RuneTreeColumn
                        key={entry.treeId}
                        tree={entry.tree!}
                        mode="secondary"
                        compact
                        selectedRuneIds={entry.runeIds}
                        preferredRuneIds={entry.preferredRuneIds}
                        readOnly
                        accentColor={accentColor}
                        extra={shardsDiffer ? shardBlock(entry.shards, entry.preferredShards) : undefined}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
    </div>
  )
}
