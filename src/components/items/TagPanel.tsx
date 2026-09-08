import type { Tag } from '../../types/tags'

export function TagPanel({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null
  return (
    <div style={{ border: '1px solid #444', borderRadius: 8, padding: 8, marginBottom: 12 }}>
      <div>Tags</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {tags.map((tag) => (
          <span
            key={tag.id}
            style={{
              border: '1px solid #666',
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 12,
              opacity: tag.origin === 'premade' ? 1 : 0.85,
            }}
          >
            {tag.label}
            {tag.origin === 'custom' ? ' *' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
