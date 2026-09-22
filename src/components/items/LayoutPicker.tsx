import { ITEM_SET_LAYOUTS, type LayoutTemplate } from '../../lib/itemSetLayouts'

interface Props {
  onChoose: (layoutId: LayoutTemplate['id']) => void
}

// Shown in place of the normal slot editor (edit mode only) whenever the current item-set has no
// items placed and hasn't been through this picker yet — see ItemsEditor's `showLayoutPicker`.
// Picking a layout only ever adds the slots it's missing (ItemsEditor's `chooseLayout`), so it's
// safe to show again for a different, still-empty category even after another category has
// already picked one.
export function LayoutPicker({ onChoose }: Props) {
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Choose a layout</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 16 }}>You can edit slots later.</div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {ITEM_SET_LAYOUTS.map((layout) => (
          <button
            key={layout.id}
            type="button"
            onClick={() => onChoose(layout.id)}
            style={{
              flex: '1 1 220px',
              minWidth: 200,
              maxWidth: 320,
              textAlign: 'left',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--gold-bright)', fontSize: 14 }}>{layout.label}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{layout.description}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {layout.slots.map((slot) => (
                <span
                  key={slot.label}
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 8,
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-dim)',
                  }}
                >
                  {slot.label}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
