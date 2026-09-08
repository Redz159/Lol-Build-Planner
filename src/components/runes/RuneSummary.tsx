import { useGameData } from '../../state/GameDataContext'
import type { RuneSelection } from '../../types/runes'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'
import { OFFENSE_SHARDS, FLEX_SHARDS, DEFENSE_SHARDS } from '../../data/statShards'
import type { DDragonRuneTree } from '../../types/ddragon'

function findRune(tree: DDragonRuneTree | undefined, id: number) {
  return tree?.slots.flatMap((s) => s.runes).find((r) => r.id === id)
}

export function RuneSummary({ value }: { value: RuneSelection }) {
  const { runeTrees } = useGameData()
  const primaryTree = runeTrees.find((t) => t.id === value.primaryTreeId)
  const secondaryTree = runeTrees.find((t) => t.id === value.secondaryTreeId)

  if (!primaryTree) {
    return <div style={{ color: 'var(--text-dim)' }}>No runes selected yet.</div>
  }

  const keystone = findRune(primaryTree, value.keystoneId)
  const primaryRunes = value.primaryRuneIds.map((id) => findRune(primaryTree, id)).filter(Boolean)
  const secondaryRunes = value.secondaryRuneIds
    .map((id) => findRune(secondaryTree, id))
    .filter(Boolean)
  const shardOptions = [
    { row: OFFENSE_SHARDS, id: value.shards.offense },
    { row: FLEX_SHARDS, id: value.shards.flex },
    { row: DEFENSE_SHARDS, id: value.shards.defense },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Tooltip title={primaryTree.name}>
          <img src={runeIconUrl(primaryTree.icon)} alt={primaryTree.name} width={22} height={22} />
        </Tooltip>
        {keystone && (
          <Tooltip title={keystone.name} descriptionHtml={keystone.shortDesc}>
            <img
              src={runeIconUrl(keystone.icon)}
              alt={keystone.name}
              width={44}
              height={44}
              style={{ borderRadius: '50%', border: '2px solid var(--gold)' }}
            />
          </Tooltip>
        )}
        {primaryRunes.map((rune) => (
          <Tooltip key={rune!.id} title={rune!.name} descriptionHtml={rune!.shortDesc}>
            <img
              src={runeIconUrl(rune!.icon)}
              alt={rune!.name}
              width={28}
              height={28}
              style={{ borderRadius: '50%', border: '1px solid var(--border-strong)' }}
            />
          </Tooltip>
        ))}
      </div>

      {secondaryTree && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tooltip title={secondaryTree.name}>
            <img src={runeIconUrl(secondaryTree.icon)} alt={secondaryTree.name} width={18} height={18} />
          </Tooltip>
          {secondaryRunes.map((rune) => (
            <Tooltip key={rune!.id} title={rune!.name} descriptionHtml={rune!.shortDesc}>
              <img
                src={runeIconUrl(rune!.icon)}
                alt={rune!.name}
                width={24}
                height={24}
                style={{ borderRadius: '50%', border: '1px solid var(--border-strong)' }}
              />
            </Tooltip>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {shardOptions.map(({ row, id }, i) => {
          const shard = row.find((s) => s.id === id)
          if (!shard) return null
          return (
            <Tooltip key={i} title={shard.name}>
              <img
                src={runeIconUrl(shard.icon)}
                alt={shard.name}
                width={18}
                height={18}
                style={{ borderRadius: '50%', border: '1px solid var(--border-strong)' }}
              />
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
