import { useGameData } from '../../state/GameDataContext'
import type { RunePage } from '../../types/runes'
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
  addVariant,
  removeVariant,
} from '../../lib/runeRules'
import { reorder } from '../../lib/reorder'
import { OFFENSE_SHARDS, FLEX_SHARDS, DEFENSE_SHARDS } from '../../data/statShards'
import { useConfirm } from '../shared/useConfirm'

interface Props {
  page: RunePage
  onChange: (next: RunePage) => void
  onDuplicate: () => void
  onRemove: () => void
  onSetPreferredKeystone: (preferred: boolean) => void
  runeGameCounts?: Record<number, number>
}

const labelStyle = {
  color: 'var(--text-dim)',
  fontSize: 12,
  marginBottom: 4,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
}

const arrowButtonStyle = { padding: '2px 8px', lineHeight: 1 }

export function RunePageEditor({ page, onChange, onDuplicate, onRemove, onSetPreferredKeystone, runeGameCounts }: Props) {
  const { runeTrees } = useGameData()
  const { confirm, dialog: confirmDialog } = useConfirm()
  if (runeTrees.length === 0) return null

  const primaryTree = runeTrees.find((t) => t.id === page.primaryTreeId)
  const keystone = primaryTree?.slots[0]?.runes.find((r) => r.id === page.keystoneId)

  return (
    <div
      className="panel"
      style={{
        padding: 18,
        marginBottom: 18,
        background: 'var(--bg-panel-raised)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <strong style={{ color: 'var(--text-heading)' }}>{keystone ? keystone.name : 'New rune page'}</strong>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => onChange(addVariant(page))}>
          + Add secondary tree option
        </button>
        <button type="button" onClick={onDuplicate}>
          Duplicate page
        </button>
        <button
          type="button"
          onClick={async () => {
            if (await confirm("Remove this rune page? This can't be undone.")) onRemove()
          }}
          style={{ color: 'var(--danger)' }}
        >
          Remove page
        </button>
      </div>

      {/* Primary tree and every secondary tree option are flat siblings in one wrapping row, not
          primary plus a single "secondary options" block — that way, when a row runs out of
          room, only the option(s) that don't fit drop to the next row instead of the whole
          secondary group jumping down together while primary still had room to spare. */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Primary tree</div>
          <RuneTreeSelector
            runeTrees={runeTrees}
            selectedId={page.primaryTreeId}
            onSelect={(id) => onChange(selectPrimaryTree(page, id))}
          />
          {primaryTree && (
            <div style={{ marginTop: 8 }}>
              <RuneTreeColumn
                tree={primaryTree}
                mode="primary"
                keystoneId={page.keystoneId}
                preferredKeystone={page.preferredKeystone}
                selectedRuneIds={page.primaryRuneIds}
                preferredRuneIds={page.preferredPrimaryRuneIds}
                onSelectKeystone={(id, preferred) => {
                  onChange(selectKeystone(page, id))
                  if (preferred) onSetPreferredKeystone(!(page.keystoneId === id && page.preferredKeystone))
                }}
                onSelectRune={(_rowIndex, id, preferred) => onChange(selectPrimaryRune(page, id, preferred))}
                gameCounts={runeGameCounts}
              />
            </div>
          )}
        </div>

        {page.variants.map((variant, index) => {
          const secondaryTree = runeTrees.find((t) => t.id === variant.secondaryTreeId)
          return (
            <div key={variant.id} style={{ marginBottom: 12 }}>
              {index === 0 && <div style={labelStyle}>Secondary tree options</div>}
              <RuneTreeSelector
                runeTrees={runeTrees}
                selectedId={variant.secondaryTreeId}
                disabledId={page.primaryTreeId}
                onSelect={(id) => onChange(selectSecondaryTree(page, variant.id, id))}
              />
              {secondaryTree && (
                <div style={{ marginTop: 8 }}>
                  <RuneTreeColumn
                    tree={secondaryTree}
                    mode="secondary"
                    selectedRuneIds={variant.secondaryRuneIds}
                    preferredRuneIds={variant.preferredSecondaryRuneIds}
                    onSelectRune={(_rowIndex, id, preferred) =>
                      onChange(selectSecondaryRune(page, variant.id, id, preferred))
                    }
                    gameCounts={runeGameCounts}
                  />
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <StatShardRow
                  options={OFFENSE_SHARDS}
                  selectedIds={variant.shards.offense}
                  preferredIds={variant.preferredShards.offense}
                  onSelect={(id, preferred) => onChange(selectShard(page, variant.id, 'offense', id, preferred))}
                  gameCounts={runeGameCounts}
                />
                <StatShardRow
                  options={FLEX_SHARDS}
                  selectedIds={variant.shards.flex}
                  preferredIds={variant.preferredShards.flex}
                  onSelect={(id, preferred) => onChange(selectShard(page, variant.id, 'flex', id, preferred))}
                  gameCounts={runeGameCounts}
                />
                <StatShardRow
                  options={DEFENSE_SHARDS}
                  selectedIds={variant.shards.defense}
                  preferredIds={variant.preferredShards.defense}
                  onSelect={(id, preferred) => onChange(selectShard(page, variant.id, 'defense', id, preferred))}
                  gameCounts={runeGameCounts}
                />
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                <button
                  type="button"
                  disabled={index === 0}
                  title="Move left"
                  style={arrowButtonStyle}
                  onClick={() => onChange({ ...page, variants: reorder(page.variants, index, index - 1) })}
                >
                  ◀
                </button>
                <button
                  type="button"
                  disabled={index === page.variants.length - 1}
                  title="Move right"
                  style={arrowButtonStyle}
                  onClick={() => onChange({ ...page, variants: reorder(page.variants, index, index + 1) })}
                >
                  ▶
                </button>
                <button
                  type="button"
                  disabled={page.variants.length <= 1}
                  onClick={async () => {
                    if (await confirm("Remove this secondary tree option? This can't be undone.")) onChange(removeVariant(page, variant.id))
                  }}
                  style={{ color: 'var(--danger)' }}
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {confirmDialog}
    </div>
  )
}
