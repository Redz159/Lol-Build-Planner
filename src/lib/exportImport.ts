import type { Build } from '../types/build'

export function exportBuild(build: Build): void {
  const blob = new Blob([JSON.stringify(build, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${build.champion.name}-${build.title}.json`.replace(/\s+/g, '_')
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBuildFile(file: File): Promise<Build> {
  const text = await file.text()
  const parsed = JSON.parse(text) as Build
  if (!parsed.id || !parsed.champion || !parsed.runes || !Array.isArray(parsed.itemSlots)) {
    throw new Error('Invalid build file')
  }
  return parsed
}
