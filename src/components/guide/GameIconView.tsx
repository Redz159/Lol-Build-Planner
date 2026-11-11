import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useIconEntry } from './iconIndexContext'

export function GameIconView({ node }: ReactNodeViewProps) {
  const ref = node.attrs.ref as string
  const label = node.attrs.label as string
  const entry = useIconEntry(ref)
  return (
    <NodeViewWrapper as="span" className="guide-icon" title={entry?.name ?? label}>
      {entry ? <img src={entry.iconUrl} alt={entry.name} draggable={false} /> : <span className="guide-icon-missing">{label}</span>}
    </NodeViewWrapper>
  )
}
