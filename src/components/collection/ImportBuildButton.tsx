import { useRef } from 'react'
import { useCollection } from '../../state/CollectionContext'
import { importBuildFile } from '../../lib/exportImport'
import { newId } from '../../lib/id'

export function ImportBuildButton() {
  const { addBuild } = useCollection()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const build = await importBuildFile(file)
    const now = new Date().toISOString()
    addBuild({ ...build, id: newId(), createdAt: now, updatedAt: now })
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Import build
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
    </>
  )
}
