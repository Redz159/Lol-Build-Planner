import { useState } from 'react'
import type { Build } from '../../types/build'
import { loadoutLabel } from '../../lib/loadouts'
import { RoleIcon } from './RoleIcon'

interface Spot {
  loadoutId: string
  categoryId: string | null
}

function sameSpot(a: Spot, b: Spot): boolean {
  return a.loadoutId === b.loadoutId && a.categoryId === b.categoryId
}

interface Props {
  title: string
  build: Build
  // 'loadout': pick a whole role-variant (used for copying a category — it always lands as a
  // new category on the target loadout, so there's nothing finer to pick).
  // 'category': pick a specific category within a loadout, or its plain rune set when it has
  // none yet (used for copying a rune page/keystone group).
  mode: 'loadout' | 'category'
  exclude: Spot
  // What a loadout's own plain (no-category) set is called as a target.
  plainLabel?: string
  onPick: (loadoutId: string, categoryId: string | null) => void
  onClose: () => void
}

// Shared destination picker for the "Copy to..." actions — lets the user duplicate a category
// into another role-variant, or a rune page/keystone group into another category, without
// rebuilding it from scratch there. Always a copy: the source is left untouched.
export function CopyToPicker({ title, build, mode, exclude, plainLabel = 'Main rune page', onPick, onClose }: Props) {
  const [pickedLabel, setPickedLabel] = useState<string | null>(null)

  const pick = (loadoutId: string, categoryId: string | null, label: string) => {
    onPick(loadoutId, categoryId)
    setPickedLabel(label)
    setTimeout(onClose, 900)
  }

  const loadouts = mode === 'loadout' ? build.loadouts.filter((l) => l.id !== exclude.loadoutId) : build.loadouts

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 11, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ padding: 18, width: 380, maxWidth: '92vw', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', padding: '4px 9px' }}>
            ✕
          </button>
        </div>

        {pickedLabel ? (
          <div style={{ color: 'var(--gold-bright)', fontSize: 13, padding: '8px 0' }}>✓ Copied to {pickedLabel}</div>
        ) : loadouts.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>No other role-variants to copy into yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadouts.map((loadout) => {
              const label = loadoutLabel(loadout)
              const header = (
                <div key="header" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>
                  {loadout.roles.map((role) => (
                    <RoleIcon key={role} role={role} size={14} />
                  ))}
                  <span>{label}</span>
                </div>
              )

              if (mode === 'loadout') {
                return (
                  <button
                    key={loadout.id}
                    type="button"
                    onClick={() => pick(loadout.id, null, label)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, textAlign: 'left', padding: '8px 10px' }}
                  >
                    {loadout.roles.map((role) => (
                      <RoleIcon key={role} role={role} size={14} />
                    ))}
                    <span>{label}</span>
                  </button>
                )
              }

              const targets: { categoryId: string | null; label: string }[] =
                loadout.categories.length === 0
                  ? [{ categoryId: null, label: plainLabel }]
                  : loadout.categories.map((c) => ({ categoryId: c.id, label: c.label }))

              return (
                <div key={loadout.id}>
                  {header}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                    {targets.map((t) => {
                      const disabled = sameSpot(exclude, { loadoutId: loadout.id, categoryId: t.categoryId })
                      return (
                        <button
                          key={String(t.categoryId)}
                          type="button"
                          disabled={disabled}
                          title={disabled ? "That's where it already is" : undefined}
                          onClick={() => pick(loadout.id, t.categoryId, `${label} · ${t.label}`)}
                          style={{ fontSize: 12, padding: '5px 9px', opacity: disabled ? 0.4 : 1 }}
                        >
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
