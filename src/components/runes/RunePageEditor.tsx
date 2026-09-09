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

interface Props {
  page: RunePage
  onChange: (next: RunePage) => void
  onDuplicate: () => void
  onRemove: () => void
  onSetPreferredKeystone: (preferred: boolean) => void
}

const labelStyle = {
  color: 'var(--text-dim)',
  fontSize: 12,
  marginBottom: 4,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
}

const arrowButtonStyle = { padding: '2px 8px', lineHeight: 1 }

export function RunePageEditor({ page, onChange, onDuplicate, onRemove, onSetPreferredKeystone }: Props) {
  const { runeTrees } = useGameData()
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
        <button type="button" onClick={onDuplicate}>
          Duplicate page
        </button>
        <button type="button" onClick={onRemove} style={{ color: 'var(--danger)' }}>
          Remove page
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={labelStyle}>Primary tree</div>
        <RuneTreeSelector
          runeTrees={runeTrees}
          selectedId={page.primaryTreeId}
          onSelect={(id) => onChange(selectPrimaryTree(page, id))}
        />
      </div>

      {primaryTree && (
        <div style={{ marginBottom: 16 }}>
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
          />
        </div>
      )}

      <div style={labelStyle}>Secondary tree options</div>
      {page.variants.map((variant, index) => {
        const secondaryTree = runeTrees.find((t) => t.id === variant.secondaryTreeId)
        return (
          <div
            key={variant.id}
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
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
                  />
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <StatShardRow
                  options={OFFENSE_SHARDS}
                  selectedIds={variant.shards.offense}
                  preferredIds={variant.preferredShards.offense}
                  onSelect={(id, preferred) => onChange(selectShard(page, variant.id, 'offense', id, preferred))}
                />
                <StatShardRow
                  options={FLEX_SHARDS}
                  selectedIds={variant.shards.flex}
                  preferredIds={variant.preferredShards.flex}
                  onSelect={(id, preferred) => onChange(selectShard(page, variant.id, 'flex', id, preferred))}
                />
                <StatShardRow
                  options={DEFENSE_SHARDS}
                  selectedIds={variant.shards.defense}
                  preferredIds={variant.preferredShards.defense}
                  onSelect={(id, preferred) => onChange(selectShard(page, variant.id, 'defense', id, preferred))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  disabled={index === 0}
                  title="Move up"
                  style={arrowButtonStyle}
                  onClick={() => onChange({ ...page, variants: reorder(page.variants, index, index - 1) })}
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={index === page.variants.length - 1}
                  title="Move down"
                  style={arrowButtonStyle}
                  onClick={() => onChange({ ...page, variants: reorder(page.variants, index, index + 1) })}
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                disabled={page.variants.length <= 1}
                onClick={() => onChange(removeVariant(page, variant.id))}
                style={{ color: 'var(--danger)' }}
              >
                Remove
              </button>
            </div>
          </div>
        )
      })}
      <button type="button" onClick={() => onChange(addVariant(page))}>
        + Add secondary tree option
      </button>
    </div>
  )
}
