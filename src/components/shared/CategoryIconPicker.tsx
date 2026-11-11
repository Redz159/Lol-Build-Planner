import { useEffect, useRef, type CSSProperties } from 'react'
import type { Category, CategoryIcon } from '../../types/build'
import type { DDragonRune } from '../../types/ddragon'
import { categoryIconChoices } from '../../lib/categories'
import { itemImageUrl, runeIconUrl } from '../../lib/ddragon'
import { useGameData } from '../../state/GameDataContext'

const UPLOAD_SIZE = 64

function useRuneLookup(): (id: number) => DDragonRune | undefined {
  const { runeTrees } = useGameData()
  return (id) => {
    for (const tree of runeTrees) {
      for (const slot of tree.slots) {
        const rune = slot.runes.find((r) => r.id === id)
        if (rune) return rune
      }
    }
    return undefined
  }
}

// Renders nothing when the icon's item/rune isn't in the loaded game data.
export function CategoryIconImage({ icon, size }: { icon: CategoryIcon | undefined; size: number }) {
  const { items } = useGameData()
  const findRune = useRuneLookup()
  if (!icon) return null
  let src: string | undefined
  if (icon.kind === 'image') src = icon.dataUrl
  else if (icon.kind === 'item') {
    const item = items.find((i) => i.id === icon.itemId)
    src = item && itemImageUrl(item.image.full)
  } else {
    const rune = findRune(icon.runeId)
    src = rune && runeIconUrl(rune.icon)
  }
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: 4, objectFit: 'cover', flexShrink: 0, display: 'block' }}
    />
  )
}

// Center-crops the image to a square and downscales it, so the stored data URL stays a few KB.
function fileToIconDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = UPLOAD_SIZE
      canvas.height = UPLOAD_SIZE
      canvas
        .getContext('2d')!
        .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, UPLOAD_SIZE, UPLOAD_SIZE)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

function optionStyle(selected: boolean): CSSProperties {
  return {
    padding: 3,
    borderRadius: 6,
    border: `2px solid ${selected ? 'var(--gold)' : 'transparent'}`,
    background: selected ? 'rgba(200, 170, 110, 0.18)' : 'var(--bg-panel-raised)',
    boxShadow: 'none',
    lineHeight: 0,
  }
}

const sectionTitle: CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', margin: '14px 0 6px' }

export function CategoryIconPicker({
  category,
  onPick,
  onClose,
}: {
  category: Category
  onPick: (icon: CategoryIcon | undefined) => void
  onClose: () => void
}) {
  const { items } = useGameData()
  const findRune = useRuneLookup()
  const fileInput = useRef<HTMLInputElement>(null)
  const { itemIds, runeIds } = categoryIconChoices(category)
  const categoryItems = itemIds.flatMap((id) => items.filter((i) => i.id === id))
  const runes = runeIds.flatMap((id) => findRune(id) ?? [])
  const current = category.icon
  const pick = (icon: CategoryIcon | undefined) => {
    onPick(icon)
    onClose()
  }
  const pickFile = async (file: File) => {
    try {
      pick({ kind: 'image', dataUrl: await fileToIconDataUrl(file) })
    } catch {
      // Not a readable image: leave the current icon as it is.
    }
  }

  // Ctrl+V anywhere while the picker is open uses a pasted image (e.g. a screenshot) as the icon.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (!file) return
      e.preventDefault()
      void pickFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 11, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 18, width: 560, maxWidth: '92vw', maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Icon for {category.label}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', padding: '4px 9px' }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={() => pick(undefined)} style={{ ...optionStyle(!current), padding: '6px 12px', lineHeight: 'normal' }}>
            No icon
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} style={{ padding: '6px 12px' }}>
            Upload image…
          </button>
          {current?.kind === 'image' && (
            <span style={{ ...optionStyle(true), display: 'inline-block' }} title="Current uploaded image">
              <CategoryIconImage icon={current} size={28} />
            </span>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) await pickFile(file)
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Or paste an image with Ctrl+V.</div>

        <div style={sectionTitle}>Items in this category</div>
        {categoryItems.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No items added yet.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {categoryItems.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.name}
                onClick={() => pick({ kind: 'item', itemId: item.id })}
                style={optionStyle(current?.kind === 'item' && current.itemId === item.id)}
              >
                <img src={itemImageUrl(item.image.full)} alt={item.name} width={36} height={36} style={{ borderRadius: 4 }} />
              </button>
            ))}
          </div>
        )}

        <div style={sectionTitle}>Runes in this category</div>
        {runes.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No runes picked yet.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {runes.map((rune) => (
              <button
                key={rune.id}
                type="button"
                title={rune.name}
                onClick={() => pick({ kind: 'rune', runeId: rune.id })}
                style={optionStyle(current?.kind === 'rune' && current.runeId === rune.id)}
              >
                <img src={runeIconUrl(rune.icon)} alt={rune.name} width={36} height={36} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
