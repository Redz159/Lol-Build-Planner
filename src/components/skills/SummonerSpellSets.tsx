import { useState } from 'react'
import type { SummonerSpellSet } from '../../types/build'
import type { DDragonSummonerSpell } from '../../types/ddragon'
import { summonerSpellImageUrl } from '../../lib/ddragon'
import { SummonerSpellRow } from '../runes/SummonerSpellRow'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  options: DDragonSummonerSpell[]
  sets: SummonerSpellSet[]
  readOnly: boolean
  onChange?: (sets: SummonerSpellSet[]) => void
}

const sameSet = (a: SummonerSpellSet, b: SummonerSpellSet) => a.length === b.length && a.every((id) => b.includes(id))

// Alternative summoner spell pairings (Flash + Ignite, Flash + Exhaust, ...). A new set is picked
// from the full spell pool and added as soon as its second spell is chosen.
export function SummonerSpellSets({ options, sets, readOnly, onChange }: Props) {
  const [draft, setDraft] = useState<string[] | null>(null)
  const [duplicate, setDuplicate] = useState(false)

  const toggleDraft = (id: string) => {
    if (!draft) return
    setDuplicate(false)
    if (draft.includes(id)) {
      setDraft(draft.filter((d) => d !== id))
      return
    }
    const next = [...draft, id]
    if (next.length < 2) {
      setDraft(next)
    } else if (sets.some((s) => sameSet(s, next))) {
      setDraft([])
      setDuplicate(true)
    } else {
      onChange?.([...sets, next])
      setDraft(null)
    }
  }

  return (
    <div>
      {sets.length === 0 && readOnly && <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>None set</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sets.map((set, index) => (
          <div key={set.join('+')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {set.map((id) => {
              const spell = options.find((s) => s.id === id)
              if (!spell) return null
              return (
                <Tooltip key={id} title={spell.name} descriptionHtml={spell.description}>
                  <img
                    src={summonerSpellImageUrl(spell.image.full)}
                    alt={spell.name}
                    width={32}
                    height={32}
                    style={{ display: 'block', borderRadius: 4, border: '1px solid var(--border-strong)' }}
                  />
                </Tooltip>
              )
            })}
            {!readOnly && (
              <button
                type="button"
                aria-label="Remove set"
                onClick={() => onChange?.(sets.filter((_, i) => i !== index))}
                style={{ padding: '2px 7px', fontSize: 12, color: 'var(--danger)' }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly &&
        (draft ? (
          <div className="panel" style={{ marginTop: 10, padding: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
              {duplicate ? 'That set already exists — pick another pair.' : `Pick 2 spells (${draft.length}/2)`}
            </div>
            <SummonerSpellRow options={options} selectedIds={draft} onToggle={toggleDraft} />
            <button type="button" onClick={() => setDraft(null)} style={{ marginTop: 8, fontSize: 12, padding: '4px 9px' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft([])
              setDuplicate(false)
            }}
            style={{ marginTop: sets.length > 0 ? 10 : 0, fontSize: 12, padding: '4px 9px' }}
          >
            + Add set
          </button>
        ))}
    </div>
  )
}
