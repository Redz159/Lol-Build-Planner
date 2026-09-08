import { useState, type ReactNode } from 'react'

interface Tab {
  key: string
  label: string
  content: ReactNode
}

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key)
  const activeTab = tabs.find((t) => t.key === active)

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActive(tab.key)}
            style={{
              border: 'none',
              borderBottom: tab.key === active ? '2px solid var(--gold)' : '2px solid transparent',
              borderRadius: 0,
              background: 'transparent',
              color: tab.key === active ? 'var(--gold-bright)' : 'var(--text-dim)',
              fontWeight: 600,
              padding: '8px 4px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab?.content}
    </div>
  )
}
