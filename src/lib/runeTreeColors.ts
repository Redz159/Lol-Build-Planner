const TREE_COLORS: Record<string, string> = {
  Precision: '#c8aa6e',
  Domination: '#ca3e3e',
  Sorcery: '#3f8fd1',
  Resolve: '#4c9c5d',
  Inspiration: '#3aa8a0',
}

export function treeAccentColor(treeKey: string): string {
  return TREE_COLORS[treeKey] ?? 'var(--border-strong)'
}
