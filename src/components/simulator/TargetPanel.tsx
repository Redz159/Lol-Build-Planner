export interface DummyStats {
  hp: number
  armor: number
  mr: number
}

export type TargetMode = 'dummy' | 'champion'

const DUMMY_FIELDS: { key: keyof DummyStats; label: string }[] = [
  { key: 'hp', label: 'Health' },
  { key: 'armor', label: 'Armor' },
  { key: 'mr', label: 'Magic Resist' },
]

export function TargetModeToggle({ mode, onChange }: { mode: TargetMode; onChange: (mode: TargetMode) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {(['dummy', 'champion'] as const).map((m) => (
        <button
          key={m}
          type="button"
          className="sim-small-button"
          onClick={() => onChange(m)}
          style={m === mode ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' } : undefined}
        >
          {m === 'dummy' ? 'Practice dummy' : 'Champion'}
        </button>
      ))}
    </div>
  )
}

// The practice-tool target dummy: just the numbers mitigation needs, freely editable.
export function DummyPanel({ dummy, onChange }: { dummy: DummyStats; onChange: (dummy: DummyStats) => void }) {
  return (
    <div className="sim-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="sim-heading" style={{ margin: 0 }}>
        Practice dummy
      </div>
      {DUMMY_FIELDS.map(({ key, label }) => (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ width: 110, color: 'var(--text-dim)' }}>{label}</span>
          <input
            type="number"
            value={dummy[key]}
            min={key === 'hp' ? 1 : undefined}
            onChange={(e) => onChange({ ...dummy, [key]: Number(e.target.value) || 0 })}
            style={{ width: 110 }}
          />
        </label>
      ))}
    </div>
  )
}
