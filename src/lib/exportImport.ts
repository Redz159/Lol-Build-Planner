import type { Build } from '../types/build'
import { migrateBuild } from './storage'

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
  const parsed = JSON.parse(text)
  if (!parsed.id || !parsed.champion || (!Array.isArray(parsed.runePages) && !Array.isArray(parsed.loadouts))) {
    throw new Error('Invalid build file')
  }
  return migrateBuild(parsed)
}
