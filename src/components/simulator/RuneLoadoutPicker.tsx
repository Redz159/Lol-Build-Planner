import type { DDragonRune, DDragonRuneTree } from '../../types/ddragon'
import type { RunePage } from '../../types/runes'
import { runeIconUrl, runeTreeIconUrl } from '../../lib/ddragon'
import { RUNE_DAMAGE, RUNE_STATS, type RuneInput } from '../../lib/runeEffects'
import { findRune, toggleSecondary, type ResolvedRunes, type RunePicks } from '../../lib/simulatorLoadout'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  pages: RunePage[]
  trees: DDragonRuneTree[]
  picks: RunePicks
  resolved: ResolvedRunes
  onChange: (picks: RunePicks) => void
}

function RunePick({ rune, picked, size = 30, onClick }: { rune?: DDragonRune; picked: boolean; size?: number; onClick?: () => void }) {
  if (!rune) return null
  return (
    <Tooltip title={rune.name} descriptionHtml={rune.shortDesc}>
      <button type="button" className={`sim-pick${picked ? ' picked' : ''}`} onClick={onClick} aria-label={rune.name}>
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

export function RuneLoadoutPicker({ pages, trees, picks, resolved, onChange }: Props) {
  const page = resolved.page
  const variant = page?.variants.find((v) => v.id === resolved.variantId)
  const set = (patch: Partial<RunePicks>) => onChange({ ...picks, ...patch })
  const rowOf = (id: number) => resolved.secondaryRows.find((r) => r.candidates.includes(id))?.row

  const inputRunes = resolved.selection.runeIds
    .map((id) => ({ id, input: RUNE_STATS[id]?.input ?? RUNE_DAMAGE[id]?.input }))
    .filter((r): r is { id: number; input: RuneInput } => !!r.input)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pages.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {pages.map((p) => {
            const keystone = findRune(trees, p.keystoneId)
            return (
              <button
                key={p.id}
                type="button"
                className={`sim-pick${p.id === page?.id ? ' picked' : ''}`}
                title={keystone?.name ?? 'Rune page'}
                onClick={() => set({ pageId: p.id, variantId: undefined, primary: {}, secondary: undefined, shards: {} })}
              >
                {keystone ? <img src={runeIconUrl(keystone.icon)} alt={keystone.name} width={30} height={30} /> : '?'}
              </button>
            )
          })}
        </div>
      )}

      {page && page.variants.length > 1 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
          Secondary:
          {page.variants.map((v) => {
            const tree = trees.find((t) => t.id === v.secondaryTreeId)
            return (
              <button
                key={v.id}
                type="button"
                className={`sim-pick${v.id === variant?.id ? ' picked' : ''}`}
                title={tree?.name ?? 'No secondary tree'}
                onClick={() => set({ variantId: v.id, secondary: undefined, shards: {} })}
              >
                {tree ? <img src={runeTreeIconUrl(tree.key)} alt={tree.name} width={22} height={22} /> : '–'}
              </button>
            )
          })}
        </div>
      )}

      {page ? (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <RunePick rune={findRune(trees, page.keystoneId)} picked size={40} />
            {resolved.primaryRows.map((row) => (
              <div key={row.row} style={{ display: 'flex', gap: 4 }}>
                {row.candidates.map((id) => (
                  <RunePick key={id} rune={findRune(trees, id)} picked={row.picked === id} onClick={() => set({ primary: { ...picks.primary, [row.row]: id } })} />
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {resolved.secondaryRows.map((row) => (
              <div key={row.row} style={{ display: 'flex', gap: 4 }}>
                {row.candidates.map((id) => (
                  <RunePick
                    key={id}
                    rune={findRune(trees, id)}
                    picked={resolved.secondary.includes(id)}
                    onClick={() => set({ secondary: toggleSecondary(resolved.secondary, id, rowOf) })}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No rune pages here — only stat shards apply.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {resolved.shardRows.map((row) => (
          <div key={row.key} style={{ display: 'flex', gap: 4 }}>
            {row.candidates.map((opt) => (
              <Tooltip key={opt.id} title={opt.name}>
                <button
                  type="button"
                  className={`sim-pick${row.picked === opt.id ? ' picked' : ''}`}
                  onClick={() => set({ shards: { ...picks.shards, [row.key]: opt.id } })}
                  aria-label={opt.name}
                >
                  <img src={runeIconUrl(opt.icon)} alt={opt.name} width={20} height={20} />
                </button>
              </Tooltip>
            ))}
          </div>
        ))}
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
