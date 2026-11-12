import { useEffect, useMemo, useState } from 'react'
import { useGameData } from '../../state/GameDataContext'
import { getAbilityIndex } from '../../lib/ddragon'
import { buildIconIndex, type AbilityIndexEntry } from '../../lib/guideIcons'
import { GuideEditor } from './GuideEditor'

interface Props {
  guide: string
  mode: 'view' | 'edit'
  onChange: (guide: string) => void
}

// Lazy-loaded from BuildDetailPage so the editor library stays out of the main bundle.
export default function GuideTab({ guide, mode, onChange }: Props) {
  const { champions, items, runeTrees, summonerSpells } = useGameData()
  const [abilities, setAbilities] = useState<AbilityIndexEntry[]>([])

  useEffect(() => {
    let cancelled = false
    getAbilityIndex()
      .then((list) => !cancelled && setAbilities(list))
      // Without the ability list the guide still works with champions, items, runes and spells.
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [])

  const iconIndex = useMemo(
    () => buildIconIndex({ champions, items, runeTrees, summonerSpells }, abilities),
    [champions, items, runeTrees, summonerSpells, abilities],
  )

  if (mode === 'view' && guide === '') {
    return <div style={{ color: 'var(--text-dim)' }}>No guide yet. Switch to edit mode to write one.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {mode === 'edit' && (
        <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
          Type <code>:</code> and a name (e.g. <code>:vol</code>) to insert a champion, item, rune or ability icon. Markdown
          shortcuts work too: <code>#</code> headings, <code>**bold**</code>, <code>*italic*</code>, <code>-</code> lists.
        </div>
      )}
      <GuideEditor value={guide} editable={mode === 'edit'} iconIndex={iconIndex} onChange={onChange} />
    </div>
  )
}
