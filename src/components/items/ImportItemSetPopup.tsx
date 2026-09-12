import { useRef, useState } from 'react'
import { parseLeagueItemSet, type ParsedItemSet } from '../../lib/leagueItemSet'

interface Props {
  onImport: (parsed: ParsedItemSet) => void
  onClose: () => void
}

export function ImportItemSetPopup({ onImport, onClose }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = async (file: File) => {
    setText(await file.text())
    setError(null)
  }

  const submit = () => {
    try {
      onImport(parseLeagueItemSet(text))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that item set.')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 11, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 18, width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Import item set</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', padding: '4px 9px' }}>
            ✕
          </button>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 8 }}>
          Paste a League item set's JSON below, or load a .json file. Each block becomes a slot
          (matched by name, or created if it doesn't exist yet) and replaces that slot's items.
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void loadFile(file)
            e.target.value = ''
          }}
          style={{ display: 'none' }}
        />
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 14px', marginBottom: 8, alignSelf: 'flex-start' }}>
          Load .json file...
        </button>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          placeholder="Paste item set JSON here..."
          style={{ flex: 1, minHeight: 220, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}
        />
        {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button type="button" onClick={submit} disabled={!text.trim()} style={{ padding: '6px 14px', alignSelf: 'flex-start' }}>
          Import
        </button>
      </div>
    </div>
  )
}
