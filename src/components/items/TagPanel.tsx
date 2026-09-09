import type { Tag } from '../../types/tags'

export function TagPanel({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null
  return (
    <div className="panel" style={{ padding: 12, marginBottom: 14 }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        Situational tags
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
        {tags.map((tag) => (
          <span
            key={tag.id}
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              padding: '3px 10px',
              fontSize: 12,
              background: 'var(--bg-panel-raised)',
              color: tag.origin === 'custom' ? 'var(--accent)' : 'var(--text)',
            }}
          >
            {tag.label}
          </span>
        ))}
      </div>
    </div>
  )
}
