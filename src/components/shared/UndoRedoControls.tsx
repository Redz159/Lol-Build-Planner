import { useCollection } from '../../state/CollectionContext'

// Floating rather than embedded in either route's own header, since there's no shared layout
// between them — this renders once at the app root and stays available on every page. Sits below
// modal overlays (z-index 100+) so it's naturally covered rather than floating over a popup.
export function UndoRedoControls() {
  const { canUndo, canRedo, undo, redo } = useCollection()
  if (!canUndo && !canRedo) return null

  const buttonStyle = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    fontSize: 16,
    lineHeight: 1,
    padding: 0,
  }

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', gap: 8, zIndex: 50 }}>
      <button type="button" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo} style={buttonStyle}>
        ↶
      </button>
      <button type="button" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo} style={buttonStyle}>
        ↷
      </button>
    </div>
  )
}
