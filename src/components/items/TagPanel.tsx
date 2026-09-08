import type { Tag } from '../../types/tags'

export function TagPanel({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 12, background: 'var(--bg-panel)' }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Situational tags
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {tags.map((tag) => (
          <span
            key={tag.id}
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 12,
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
