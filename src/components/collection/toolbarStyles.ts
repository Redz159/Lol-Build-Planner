import type { CSSProperties } from 'react'

// Shared look for the collection toolbar. A panel opened from the toolbar (new build, import,
// export...) renders on its own row below it rather than inside the button row, so the other
// buttons can't be mistaken for part of it. The gold left edge matches the gold border its
// trigger button wears while the panel is open.
export const toolbarPanelStyle: CSSProperties = {
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  borderLeft: '3px solid var(--gold)',
}

export const toolbarPanelTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  color: 'var(--text-heading)',
  fontSize: 14,
}

// Toolbar button whose panel is currently open — looks pressed.
export const activeButtonStyle: CSSProperties = {
  borderColor: 'var(--gold)',
  color: 'var(--gold-bright)',
  background: 'var(--bg-panel)',
  boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.6)',
}

// The one button in a panel that commits it (Create, Import, Download).
export const primaryButtonStyle: CSSProperties = {
  borderColor: 'var(--gold)',
  background: 'var(--gold)',
  color: '#1a1408',
  fontWeight: 600,
}
