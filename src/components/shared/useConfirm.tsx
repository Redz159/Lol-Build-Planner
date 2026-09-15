import { useCallback, useEffect, useRef, useState } from 'react'

// A small, app-styled stand-in for window.confirm — used before any destructive action big
// enough to matter (deleting a build, a role-variant, a category, a rune page, an item slot, an
// example build, ...) but deliberately skipped for cheap, frequent, single-item edits (removing
// one placement, clearing one note) where a dialog would just be annoying friction.
//
// Usage: `const { confirm, dialog } = useConfirm()` in the component, `if (await confirm('Delete
// this build? This can't be undone.')) doTheDelete()` at the call site, and render `{dialog}`
// once anywhere in that component's JSX.
export function useConfirm() {
  const [message, setMessage] = useState<string | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((text: string) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setMessage(text)
    })
  }, [])

  const settle = (value: boolean) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setMessage(null)
  }

  useEffect(() => {
    if (!message) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false)
      else if (e.key === 'Enter') settle(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [message])

  const dialog = message && (
    <div
      onClick={() => settle(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 11, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ padding: 20, width: 360, maxWidth: '90vw' }}>
        <div style={{ marginBottom: 16 }}>{message}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => settle(false)}>
            Cancel
          </button>
          <button type="button" autoFocus onClick={() => settle(true)} style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )

  return { confirm, dialog }
}
