import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCollection } from '../state/CollectionContext'
import { useGameData } from '../state/GameDataContext'
import { Tabs } from '../components/shared/Tabs'
import { CategoryTabs } from '../components/shared/CategoryTabs'
import { RunePagesEditor } from '../components/runes/RunePagesEditor'
import { RunePagesViewer } from '../components/runes/RunePagesViewer'
import { ItemsEditor } from '../components/items/ItemsEditor'
import { exportBuild } from '../lib/exportImport'
import { championImageUrl } from '../lib/ddragon'
import {
  FILL_ICON_URL,
  ROLES,
  ROLE_LABELS,
  applySupportStarterDefault,
  assignRole,
  loadoutLabel,
  removeLoadout,
  roleOwnerLoadoutId,
  splitLoadout,
  visibleItemSlots,
} from '../lib/loadouts'
import {
  addCategory,
  copyCategoryToLoadout,
  deleteCategory,
  duplicateCategory,
  mergedCategoryRunePages,
  renameCategory,
  toggleCategoryPlacement,
} from '../lib/categories'
import { cloneRunePages } from '../lib/runeRules'
import { RoleIcon } from '../components/shared/RoleIcon'
import { CopyToPicker } from '../components/shared/CopyToPicker'
import type { RunePage } from '../types/runes'
import type { Build, Loadout, Role } from '../types/build'

export function BuildDetailPage() {
  const { buildId } = useParams<{ buildId: string }>()
  const { builds, updateBuild, deleteBuild, duplicateBuild } = useCollection()
  const { champions, items } = useGameData()
  const navigate = useNavigate()
  const location = useLocation()
  const build = builds.find((b) => b.id === buildId)
  const champion = champions.find((c) => c.id === build?.champion.id)
  const [mode, setMode] = useState<'view' | 'edit'>(
    (location.state as { startInEdit?: boolean } | null)?.startInEdit ? 'edit' : 'view',
  )
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(build?.title ?? '')
  const [preEditSnapshot, setPreEditSnapshot] = useState<Build | null>(null)
  const [selectedKeystoneId, setSelectedKeystoneId] = useState<number | null>(null)
  const [activeLoadoutId, setActiveLoadoutId] = useState<string | undefined>(build?.loadouts[0]?.id)
  // Raw tab selection — 'all' or a category id the user picked, or null before any pick. Falls
  // back to the first category once any exist, and to the loadout's own plain runes/items when
  // none do, so a deleted or not-yet-chosen category (or one from a different loadout variant)
  // never leaves the view on a dangling id.
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  // Which category is up for a cross-role-variant "Copy to..." right now, if any.
  const [categoryCopySourceId, setCategoryCopySourceId] = useState<string | null>(null)
  // Which rune page(s) are up for a cross-category "Copy to..." right now, if any, along with
  // where they came from (so the picker can exclude that exact spot as a destination).
  const [runeCopySource, setRuneCopySource] = useState<{ pages: RunePage[]; loadoutId: string; categoryId: string | null } | null>(null)

  useEffect(() => {
    if (build && !build.loadouts.some((l) => l.id === activeLoadoutId)) {
      setActiveLoadoutId(build.loadouts[0]?.id)
    }
  }, [build, activeLoadoutId])

  if (!build) return <div style={{ padding: 24 }}>Build not found. <Link to="/">Back</Link></div>

  const activeLoadout = build.loadouts.find((l) => l.id === activeLoadoutId) ?? build.loadouts[0]

  // A category bundles its own rune pages and its own item set — Runes and Items are its
  // children, not the other way around. No categories at all means the loadout's own plain
  // runePages/items, exactly as before categories existed.
  const effectiveCategoryId =
    activeLoadout.categories.length === 0
      ? null
      : selectedCategoryId === 'all' || activeLoadout.categories.some((c) => c.id === selectedCategoryId)
        ? selectedCategoryId
        : activeLoadout.categories[0].id
  const activeCategory =
    effectiveCategoryId && effectiveCategoryId !== 'all' ? activeLoadout.categories.find((c) => c.id === effectiveCategoryId) : undefined
  const isAllCategoryView = effectiveCategoryId === 'all'
  const currentRunePages: RunePage[] = activeCategory
    ? activeCategory.runePages
    : isAllCategoryView
      ? mergedCategoryRunePages(activeLoadout.categories)
      : activeLoadout.runePages

  const save = (patch: Partial<typeof build>) => {
    updateBuild({ ...build, ...patch, updatedAt: new Date().toISOString() })
  }

  const saveLoadout = (patch: Partial<Loadout>) => {
    save({ loadouts: build.loadouts.map((l) => (l.id === activeLoadout.id ? { ...l, ...patch } : l)) })
  }

  // Writes go to whichever rune-page set is active; a no-op while viewing the merged "All" tab,
  // since it has no single category to write into.
  const setCurrentRunePages = (runePages: RunePage[]) => {
    if (activeCategory) {
      saveLoadout({ categories: activeLoadout.categories.map((c) => (c.id === activeCategory.id ? { ...c, runePages } : c)) })
    } else if (!isAllCategoryView) {
      saveLoadout({ runePages })
    }
  }

  const addCategoryHandler = (label: string) => {
    const categories = addCategory(
      activeLoadout.categories,
      activeLoadout.itemSlots,
      label,
      activeLoadout.categories.length === 0 ? { runePages: activeLoadout.runePages, items: activeLoadout.items } : undefined,
    )
    saveLoadout({ categories })
    setSelectedCategoryId(categories[categories.length - 1].id)
  }

  const renameCategoryHandler = (id: string, label: string) => {
    saveLoadout({ categories: renameCategory(activeLoadout.categories, id, label) })
  }

  const deleteCategoryHandler = (id: string) => {
    saveLoadout({ categories: deleteCategory(activeLoadout.categories, id) })
  }

  const duplicateCategoryHandler = (id: string) => {
    const { categories, newId: clonedId } = duplicateCategory(activeLoadout.categories, activeLoadout.itemSlots, id)
    saveLoadout({ categories })
    setSelectedCategoryId(clonedId)
  }

  const copyCategoryToLoadoutHandler = (targetLoadoutId: string) => {
    const source = activeLoadout.categories.find((c) => c.id === categoryCopySourceId)
    const target = build.loadouts.find((l) => l.id === targetLoadoutId)
    if (!source || !target) return
    const { categories } = copyCategoryToLoadout(target.categories, target.itemSlots, source)
    save({ loadouts: build.loadouts.map((l) => (l.id === targetLoadoutId ? { ...l, categories } : l)) })
  }

  const copyRunePagesHandler = (targetLoadoutId: string, targetCategoryId: string | null) => {
    if (!runeCopySource) return
    const cloned = cloneRunePages(runeCopySource.pages)
    save({
      loadouts: build.loadouts.map((l) => {
        if (l.id !== targetLoadoutId) return l
        if (targetCategoryId) {
          return { ...l, categories: l.categories.map((c) => (c.id === targetCategoryId ? { ...c, runePages: [...c.runePages, ...cloned] } : c)) }
        }
        return { ...l, runePages: [...l.runePages, ...cloned] }
      }),
    })
  }

  // The category tab row's own quick-add popup only ever copies existing item placements between
  // categories — see CategoryTabs for why runes aren't part of that shortcut.
  const toggleCategoryItemHandler = (categoryId: string, slotId: string, itemId: string) => {
    saveLoadout({
      categories: activeLoadout.categories.map((c) => (c.id === categoryId ? { ...c, items: toggleCategoryPlacement(c.items, slotId, itemId) } : c)),
    })
  }

  const toggleRole = (role: Role, checked: boolean) => {
    let next = assignRole(build, activeLoadout.id, role, checked)
    if (role === 'support' && checked) {
      next = applySupportStarterDefault(next, activeLoadout.id, items)
    }
    save(next)
  }

  const addVariant = () => {
    const { build: next, newLoadoutId } = splitLoadout(build, activeLoadout.id)
    save(next)
    setActiveLoadoutId(newLoadoutId)
  }

  const deleteVariant = () => {
    save(removeLoadout(build, activeLoadout.id))
  }

  const enterEdit = () => {
    setPreEditSnapshot(structuredClone(build))
    setMode('edit')
  }

  const doneEditing = () => {
    setPreEditSnapshot(null)
    setEditingTitle(false)
    setMode('view')
  }

  const cancelEditing = () => {
    if (preEditSnapshot) updateBuild(preEditSnapshot)
    setPreEditSnapshot(null)
    setEditingTitle(false)
    setMode('view')
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1160, margin: '0 auto' }}>
      <Link to="/">&larr; Back to collection</Link>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          margin: '16px 0 22px',
          paddingBottom: 20,
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {editingTitle ? (
          <>
            <input type="text" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
            <button
              type="button"
              onClick={() => {
                save({ title: titleDraft.trim() || build.title })
                setEditingTitle(false)
              }}
            >
              Save
            </button>
          </>
        ) : (
          <>
            {champion && (
              <img
                src={championImageUrl(champion.image.full)}
                alt={champion.name}
                width={40}
                height={40}
                style={{ borderRadius: 8, border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' }}
              />
            )}
            <h1 style={{ margin: 0, fontSize: 28 }}>
              {build.title} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({build.champion.name})</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {build.loadouts.map((l, i) => (
                <span key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <span style={{ color: 'var(--gold)' }}>/</span>}
                  {l.roles.length === 0 ? (
                    <img src={FILL_ICON_URL} alt="Fill" title="Fill" width={18} height={18} />
                  ) : (
                    l.roles.map((role) => <RoleIcon key={role} role={role} size={18} />)
                  )}
                </span>
              ))}
            </div>
            {mode === 'edit' && (
              <button type="button" onClick={() => setEditingTitle(true)}>
                Rename
              </button>
            )}
          </>
        )}
        <div style={{ flex: 1 }} />
        {mode === 'edit' && (
          <button type="button" onClick={cancelEditing} style={{ color: 'var(--danger)' }}>
            ✕ Cancel
          </button>
        )}
        <button
          type="button"
          onClick={mode === 'view' ? enterEdit : doneEditing}
          style={
            mode === 'edit'
              ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' }
              : undefined
          }
        >
          {mode === 'view' ? '✏️ Edit build' : '✓ Done editing'}
        </button>
        <button type="button" onClick={() => duplicateBuild(build.id)}>
          Duplicate
        </button>
        <button type="button" onClick={() => exportBuild(build)}>
          Export
        </button>
        <button
          type="button"
          onClick={() => {
            deleteBuild(build.id)
            navigate('/')
          }}
          style={{ color: 'var(--danger)' }}
        >
          Delete
        </button>
      </div>

      {build.loadouts.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {build.loadouts.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setActiveLoadoutId(l.id)}
              title={loadoutLabel(l)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                ...(l.id === activeLoadout.id ? { borderColor: 'var(--gold)', color: 'var(--gold-bright)' } : {}),
              }}
            >
              {l.roles.length === 0 ? (
                <img src={FILL_ICON_URL} alt="Fill" width={16} height={16} />
              ) : (
                l.roles.map((role) => <RoleIcon key={role} role={role} size={16} />)
              )}
            </button>
          ))}
          {mode === 'edit' && (
            <button type="button" onClick={deleteVariant} style={{ color: 'var(--danger)' }}>
              Delete variant
            </button>
          )}
        </div>
      )}

      {mode === 'edit' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--text-dim)',
            flexWrap: 'wrap',
          }}
        >
          <span>Applies to:</span>
          {ROLES.map((role) => {
            const ownerId = roleOwnerLoadoutId(build, role)
            const takenElsewhere = ownerId !== undefined && ownerId !== activeLoadout.id
            return (
              <label
                key={role}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: takenElsewhere ? 'not-allowed' : undefined,
                }}
                title={takenElsewhere ? `${ROLE_LABELS[role]} is already assigned to another variant` : undefined}
              >
                <input
                  type="checkbox"
                  checked={activeLoadout.roles.includes(role)}
                  disabled={takenElsewhere}
                  onChange={(e) => toggleRole(role, e.target.checked)}
                />
                <RoleIcon role={role} size={18} dim={takenElsewhere} />
              </label>
            )
          })}
          <button type="button" onClick={addVariant} style={{ marginLeft: 'auto' }}>
            + New variant
          </button>
        </div>
      )}

      <CategoryTabs
        categories={activeLoadout.categories}
        slots={visibleItemSlots(activeLoadout.itemSlots, activeLoadout.roles)}
        items={items}
        itemNotes={activeLoadout.itemNotes}
        itemSlotNotes={activeLoadout.itemSlotNotes}
        itemNoteGlobal={activeLoadout.itemNoteGlobal}
        itemSituational={activeLoadout.itemSituational}
        mode={mode}
        activeId={effectiveCategoryId}
        onSelect={setSelectedCategoryId}
        onAdd={addCategoryHandler}
        onRename={renameCategoryHandler}
        onDelete={deleteCategoryHandler}
        onDuplicate={duplicateCategoryHandler}
        onCopyOut={build.loadouts.length > 1 ? setCategoryCopySourceId : undefined}
        onToggleCategoryItem={toggleCategoryItemHandler}
      />
      {categoryCopySourceId && (
        <CopyToPicker
          title={`Copy "${activeLoadout.categories.find((c) => c.id === categoryCopySourceId)?.label ?? ''}" to...`}
          build={build}
          mode="loadout"
          exclude={{ loadoutId: activeLoadout.id, categoryId: null }}
          onPick={(targetLoadoutId) => copyCategoryToLoadoutHandler(targetLoadoutId)}
          onClose={() => setCategoryCopySourceId(null)}
        />
      )}

      <Tabs
        tabs={[
          {
            key: 'runes',
            label: 'Runes',
            content:
              mode === 'edit' && !isAllCategoryView ? (
                <RunePagesEditor
                  key={`${activeLoadout.id}:${effectiveCategoryId}`}
                  pages={currentRunePages}
                  onChange={setCurrentRunePages}
                  initialKeystoneId={selectedKeystoneId}
                  onGroupSelect={setSelectedKeystoneId}
                  onCopyOut={(pages) => setRuneCopySource({ pages, loadoutId: activeLoadout.id, categoryId: effectiveCategoryId })}
                />
              ) : (
                <>
                  {isAllCategoryView && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 10 }}>
                      "All" is a read-only merge of every category — pick a category to edit its runes.
                    </div>
                  )}
                  <RunePagesViewer
                    key={`${activeLoadout.id}:${effectiveCategoryId}`}
                    pages={currentRunePages}
                    selectedKeystoneId={selectedKeystoneId}
                    onSelectKeystoneId={setSelectedKeystoneId}
                  />
                </>
              ),
          },
          {
            key: 'items',
            label: 'Items',
            content: (
              <ItemsEditor
                key={`${activeLoadout.id}:${effectiveCategoryId}`}
                loadout={activeLoadout}
                mode={mode}
                onChange={(patch) => saveLoadout(patch)}
                championKey={champion?.key}
                buildTitle={build.title}
                activeCategoryId={effectiveCategoryId}
              />
            ),
          },
        ]}
      />
      {runeCopySource && (
        <CopyToPicker
          title="Copy rune page to..."
          build={build}
          mode="category"
          exclude={{ loadoutId: runeCopySource.loadoutId, categoryId: runeCopySource.categoryId }}
          onPick={(targetLoadoutId, targetCategoryId) => copyRunePagesHandler(targetLoadoutId, targetCategoryId)}
          onClose={() => setRuneCopySource(null)}
        />
      )}
    </div>
  )
}
