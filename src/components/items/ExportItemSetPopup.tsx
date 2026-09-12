import { useRef, useState, type MouseEvent } from 'react'
import { downloadLeagueItemSet, leagueItemSetJson, type LeagueItemSet } from '../../lib/leagueItemSet'

interface Props {
  itemSet: LeagueItemSet
  onClose: () => void
}

export function ExportItemSetPopup({ itemSet, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const json = leagueItemSetJson(itemSet)

  // navigator.clipboard can be unavailable, refuse permission, or stall on a prompt the user
  // never answers — race it against a short timeout and fall back to selecting the text so the
  // user can still copy it with Ctrl+C.
  const copy = async () => {
    try {
      await Promise.race([
        navigator.clipboard.writeText(json),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error('timed out')), 800)),
      ])
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      textareaRef.current?.select()
    }
  }

  const selectAll = (e: MouseEvent<HTMLTextAreaElement>) => (e.target as HTMLTextAreaElement).select()

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
          <div style={{ fontWeight: 600 }}>Export item set</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', padding: '4px 9px' }}>
            ✕
          </button>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 8 }}>
          Paste this into the League client's item set import, or save it as a .json file in your
          Config/Champions/&lt;Champion&gt;/Recommended folder.
        </div>
        <textarea
          ref={textareaRef}
          readOnly
          value={json}
          onClick={selectAll}
          style={{ flex: 1, minHeight: 260, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={copy} style={{ padding: '6px 14px' }}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <button type="button" onClick={() => downloadLeagueItemSet(itemSet)} style={{ padding: '6px 14px' }}>
            Download .json
          </button>
        </div>
      </div>
    </div>
  )
}
