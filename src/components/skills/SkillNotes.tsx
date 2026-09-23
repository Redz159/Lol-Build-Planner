import { Tooltip } from '../shared/Tooltip'

// Same gold "?" marker ItemIcon shows on an item with a note; hovering it shows just the note.
export function NoteBadge({ note }: { note: string }) {
  return (
    <Tooltip note={note}>
      <span
        aria-label={`Note: ${note}`}
        style={{
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 700,
          background: 'var(--gold)',
          color: '#0a0e14',
          borderRadius: '50%',
          width: 18,
          height: 18,
          lineHeight: '18px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'help',
        }}
      >
        ?
      </span>
    </Tooltip>
  )
}

// Styled like the item popup's note field.
export function NoteEditor({ note, placeholder, onChange }: { note: string; placeholder: string; onChange: (note: string) => void }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 8 }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>Note</div>
        {note && (
          <button type="button" onClick={() => onChange('')} style={{ marginLeft: 'auto', padding: '1px 8px', fontSize: 11 }}>
            Clear
          </button>
        )}
      </div>
      <textarea
        value={note}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus
        style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
      />
    </div>
  )
}
