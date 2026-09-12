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

// `looksLikeBuildJson` and `parseBuildJson` are split out so callers that only have raw text
// (pasted from the clipboard, not necessarily a File) can reuse the same parsing/migration path.
export function looksLikeBuildJson(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as Record<string, unknown>
  return !!obj.id && !!obj.champion && (Array.isArray(obj.runePages) || Array.isArray(obj.loadouts))
}

export function parseBuildJson(raw: unknown): Build {
  if (!looksLikeBuildJson(raw)) throw new Error('Invalid build file')
  return migrateBuild(raw)
}

export async function importBuildFile(file: File): Promise<Build> {
  return parseBuildJson(JSON.parse(await file.text()))
}
