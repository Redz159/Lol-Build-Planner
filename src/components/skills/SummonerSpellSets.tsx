import { useState } from 'react'
import { spellSetKey, type Role, type SummonerSpellSet } from '../../types/build'
import type { DDragonSummonerSpell } from '../../types/ddragon'
import { summonerSpellImageUrl } from '../../lib/ddragon'
import { SummonerSpellRow } from '../runes/SummonerSpellRow'
import { Tooltip } from '../shared/Tooltip'
import { NoteBadge, NoteEditor } from './SkillNotes'

interface Props {
  options: DDragonSummonerSpell[]
  sets: SummonerSpellSet[]
  // Tooltip note per set, keyed by spellSetKey.
  notes: Record<string, string>
  // The variant's roles decide whether Smite may (or must) be taken.
  roles: Role[]
  readOnly: boolean
  onChange?: (sets: SummonerSpellSet[], notes: Record<string, string>) => void
}

const SMITE_ID = 'SummonerSmite'

const sameSet = (a: SummonerSpellSet, b: SummonerSpellSet) => a.length === b.length && a.every((id) => b.includes(id))

// Smite is jungle-only: it can only be taken by a variant that plays jungle (a roles-less "Fill"
// variant covers jungle too), and a jungle-only variant must take it.
function smiteRule(roles: Role[]): 'forbidden' | 'allowed' | 'required' {
  if (roles.length === 1 && roles[0] === 'jungle') return 'required'
  return roles.length === 0 || roles.includes('jungle') ? 'allowed' : 'forbidden'
}

// Alternative summoner spell pairings (Flash + Ignite, Flash + Exhaust, ...). A new set is picked
// from the full spell pool and added as soon as its second spell is chosen.
export function SummonerSpellSets({ options, sets, notes, roles, readOnly, onChange }: Props) {
  const [draft, setDraft] = useState<string[] | null>(null)
  const [duplicate, setDuplicate] = useState(false)
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null)

  // Blank notes are dropped rather than stored, same as item notes.
  const setNote = (key: string, text: string) => {
    const { [key]: _previous, ...rest } = notes
    onChange?.(sets, text.trim() ? { ...rest, [key]: text } : rest)
  }

  const smite = smiteRule(roles)
  const pickable = smite === 'forbidden' ? options.filter((s) => s.id !== SMITE_ID) : options
  const initialDraft = smite === 'required' ? [SMITE_ID] : []

  // Sets saved before the variant's roles changed (or copied in from another variant) can break
  // the Smite rule — they're kept, but flagged so the user can fix them.
  const problem = (set: SummonerSpellSet) => {
    if (smite === 'forbidden' && set.includes(SMITE_ID)) return 'Smite is jungle-only — this variant has no Jungle role.'
    if (smite === 'required' && !set.includes(SMITE_ID)) return 'A jungle-only variant has to take Smite.'
    return null
  }

  const toggleDraft = (id: string) => {
    if (!draft) return
    if (smite === 'required' && id === SMITE_ID) return
    setDuplicate(false)
    if (draft.includes(id)) {
      setDraft(draft.filter((d) => d !== id))
      return
    }
    const next = [...draft, id]
    if (next.length < 2) {
      setDraft(next)
    } else if (sets.some((s) => sameSet(s, next))) {
      setDraft(initialDraft)
      setDuplicate(true)
    } else {
      // A jungle-only set reads "spell + Smite", with the locked-in Smite second.
      onChange?.([...sets, smite === 'required' ? [id, SMITE_ID] : next], notes)
      setDraft(null)
    }
  }

  return (
    <div>
      {sets.length === 0 && readOnly && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>None set</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sets.map((set, index) => {
          const key = spellSetKey(set)
          const note = notes[key]
          const names = set.map((id) => options.find((s) => s.id === id)?.name ?? id).join(' + ')
          return (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {set.map((id) => {
                  const spell = options.find((s) => s.id === id)
                  if (!spell) return null
                  return (
                    <Tooltip key={id} title={spell.name} descriptionHtml={spell.description} note={note}>
                      <img
                        src={summonerSpellImageUrl(spell.image.full)}
                        alt={spell.name}
                        width={44}
                        height={44}
                        style={{ display: 'block', borderRadius: 4, border: '1px solid var(--border-strong)' }}
                      />
                    </Tooltip>
                  )
                })}
                {note && <NoteBadge note={note} />}
                {problem(set) && (
                  <span title={problem(set) ?? undefined} aria-label={problem(set) ?? undefined} style={{ color: 'var(--preferred)', fontSize: 18, cursor: 'help' }}>
                    ⚠
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={`${editingNoteKey === key ? 'Close' : 'Edit'} note for ${names}`}
                    aria-pressed={editingNoteKey === key}
                    onClick={() => setEditingNoteKey(editingNoteKey === key ? null : key)}
                    style={{ padding: '4px 9px', fontSize: 13, ...(note || editingNoteKey === key ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' } : {}) }}
                  >
                    ✎
                  </button>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    aria-label="Remove set"
                    onClick={() => {
                      const { [key]: _removed, ...rest } = notes
                      onChange?.(sets.filter((_, i) => i !== index), rest)
                    }}
                    style={{ padding: '4px 9px', fontSize: 13, color: 'var(--danger)' }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {!readOnly && editingNoteKey === key && (
                <NoteEditor note={note ?? ''} placeholder={`Shown on the ${names} tooltip...`} onChange={(text) => setNote(key, text)} />
              )}
            </div>
          )
        })}
      </div>

      {!readOnly &&
        (draft ? (
          <div className="panel" style={{ marginTop: 10, padding: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
              {duplicate
                ? 'That set already exists — pick another pair.'
                : smite === 'required'
                  ? 'Jungle takes Smite — pick the spell to go with it.'
                  : `Pick 2 spells (${draft.length}/2)`}
            </div>
            <SummonerSpellRow options={pickable} selectedIds={draft} onToggle={toggleDraft} />
            <button type="button" onClick={() => setDraft(null)} style={{ marginTop: 8, fontSize: 13, padding: '6px 12px' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(initialDraft)
              setDuplicate(false)
            }}
            style={{ marginTop: sets.length > 0 ? 10 : 0, fontSize: 13, padding: '6px 12px' }}
          >
            + Add set
          </button>
        ))}
    </div>
  )
}
