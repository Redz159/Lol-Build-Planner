import type { DDragonRune, DDragonRuneTree } from '../../types/ddragon'
import type { RunePage } from '../../types/runes'
import { runeIconUrl, runeTreeIconUrl } from '../../lib/ddragon'
import { RUNE_DAMAGE, RUNE_STATS, type RuneInput } from '../../lib/runeEffects'
import { findRune, presetPicks, toggleSecondary, type ResolvedRunes, type RunePicks } from '../../lib/simulatorLoadout'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  pages: RunePage[]
  trees: DDragonRuneTree[]
  picks: RunePicks
  resolved: ResolvedRunes
  onChange: (picks: RunePicks) => void
}

// `suggested` marks a rune the loaded premade page lists as viable.
function RunePick({ rune, picked, suggested, size = 26, onClick }: { rune?: DDragonRune; picked: boolean; suggested?: boolean; size?: number; onClick?: () => void }) {
  if (!rune) return null
  return (
    <Tooltip title={rune.name} descriptionHtml={rune.shortDesc}>
      <button type="button" className={`sim-pick${picked ? ' picked' : ''}${suggested ? ' suggested' : ''}`} onClick={onClick} aria-label={rune.name}>
        <img src={runeIconUrl(rune.icon)} alt={rune.name} width={size} height={size} />
      </button>
    </Tooltip>
  )
}

function InputControl({ input, value, onChange }: { input: RuneInput; value: number; onChange: (v: number) => void }) {
  if (input.type === 'toggle') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input type="checkbox" checked={value === 1} onChange={(e) => onChange(e.target.checked ? 1 : 0)} />
        {input.label}
      </label>
    )
  }
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {input.label}
      <input
        type="number"
        className="sim-number-input"
        min={0}
        max={input.max}
        value={value}
        onChange={(e) => onChange(Math.min(input.max, Math.max(0, Number(e.target.value) || 0)))}
      />
    </label>
  )
}

function TreeTabs({ trees, selectedId, excludeId, onSelect }: { trees: DDragonRuneTree[]; selectedId?: number; excludeId?: number; onSelect: (id: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {trees
        .filter((t) => t.id !== excludeId)
        .map((tree) => (
          <button key={tree.id} type="button" className={`sim-pick${tree.id === selectedId ? ' picked' : ''}`} title={tree.name} onClick={() => onSelect(tree.id)}>
            <img src={runeTreeIconUrl(tree.key)} alt={tree.name} width={22} height={22} />
          </button>
        ))}
    </div>
  )
}

export function RuneLoadoutPicker({ pages, trees, picks, resolved, onChange }: Props) {
  const set = (patch: Partial<RunePicks>) => onChange({ ...picks, ...patch })
  const rowOf = (id: number) => resolved.secondaryRows.find((r) => r.candidates.includes(id))?.row
  const suggested = (id: number) => resolved.suggested.has(id)

  const inputRunes = resolved.selection.runeIds
    .map((id) => ({ id, input: RUNE_STATS[id]?.input ?? RUNE_DAMAGE[id]?.input }))
    .filter((r): r is { id: number; input: RuneInput } => !!r.input)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {pages.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-dim)' }}>
          Build pages:
          {pages.flatMap((page) =>
            page.variants.map((variant) => {
              const keystone = findRune(trees, page.keystoneId)
              const secondaryTree = trees.find((t) => t.id === variant.secondaryTreeId)
              const active = picks.presetPageId === page.id && picks.presetVariantId === variant.id
              return (
                <button
                  key={`${page.id}:${variant.id}`}
                  type="button"
                  className={`sim-pick${active ? ' picked' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 2, opacity: 1 }}
                  title={`Load ${keystone?.name ?? 'rune page'}${secondaryTree ? ` + ${secondaryTree.name}` : ''}`}
                  onClick={() => onChange(presetPicks(page, variant.id, trees, picks.inputs))}
                >
                  {keystone && <img src={runeIconUrl(keystone.icon)} alt={keystone.name} width={26} height={26} />}
                  {secondaryTree && <img src={runeTreeIconUrl(secondaryTree.key)} alt={secondaryTree.name} width={14} height={14} />}
                </button>
              )
            }),
          )}
          <span style={{ marginLeft: 4 }}>· dotted border = listed on the loaded page</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="sim-subheading">Primary</div>
          <TreeTabs
            trees={trees}
            selectedId={resolved.primaryTreeId}
            onSelect={(id) =>
              set({
                primaryTreeId: id,
                keystoneId: undefined,
                primary: {},
                ...(picks.secondaryTreeId === id ? { secondaryTreeId: undefined, secondary: [] } : {}),
              })
            }
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {resolved.keystones.map((id) => (
              <RunePick key={id} rune={findRune(trees, id)} size={34} picked={resolved.keystoneId === id} suggested={suggested(id)} onClick={() => set({ keystoneId: id })} />
            ))}
          </div>
          {resolved.primaryRows.map((row) => (
            <div key={row.row} style={{ display: 'flex', gap: 4 }}>
              {row.candidates.map((id) => (
                <RunePick
                  key={id}
                  rune={findRune(trees, id)}
                  picked={row.picked === id}
                  suggested={suggested(id)}
                  onClick={() => set({ primary: { ...picks.primary, [row.row]: id } })}
                />
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="sim-subheading">Secondary</div>
          <TreeTabs trees={trees} selectedId={resolved.secondaryTreeId} excludeId={resolved.primaryTreeId} onSelect={(id) => set({ secondaryTreeId: id, secondary: [] })} />
          {resolved.secondaryRows.map((row) => (
            <div key={row.row} style={{ display: 'flex', gap: 4 }}>
              {row.candidates.map((id) => (
                <RunePick
                  key={id}
                  rune={findRune(trees, id)}
                  picked={resolved.secondary.includes(id)}
                  suggested={suggested(id)}
                  onClick={() => set({ secondary: toggleSecondary(resolved.secondary, id, rowOf) })}
                />
              ))}
            </div>
          ))}

          <div className="sim-subheading" style={{ marginTop: 6 }}>
            Shards
          </div>
          {resolved.shardRows.map((row) => (
            <div key={row.key} style={{ display: 'flex', gap: 4 }}>
              {row.candidates.map((opt) => (
                <Tooltip key={opt.id} title={opt.name}>
                  <button
                    type="button"
                    className={`sim-pick${row.picked === opt.id ? ' picked' : ''}${suggested(opt.id) ? ' suggested' : ''}`}
                    onClick={() => set({ shards: { ...picks.shards, [row.key]: row.picked === opt.id ? undefined : opt.id } })}
                    aria-label={opt.name}
                  >
                    <img src={runeIconUrl(opt.icon)} alt={opt.name} width={20} height={20} />
                  </button>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </div>

      {inputRunes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5 }}>
          {inputRunes.map(({ id, input }) => {
            const rune = findRune(trees, id)
            const value = picks.inputs[id] ?? (input.type === 'toggle' ? (input.default ? 1 : 0) : input.default)
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {rune && <img src={runeIconUrl(rune.icon)} alt="" width={18} height={18} />}
                <span style={{ color: 'var(--text-dim)', minWidth: 110 }}>{rune?.name}</span>
                <InputControl input={input} value={value} onChange={(v) => set({ inputs: { ...picks.inputs, [id]: v } })} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
