import type { Build, Loadout, Role } from '../types/build'
import { emptyBuildItems } from '../types/items'
import { newId } from './id'

export const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support']

export const ROLE_LABELS: Record<Role, string> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
}

const ROLE_ICON_KEYS: Record<Role, string> = {
  top: 'top',
  jungle: 'jungle',
  mid: 'middle',
  adc: 'bottom',
  support: 'utility',
}

// Riot's own champion-select position icons, mirrored on CommunityDragon — Data Dragon
// itself doesn't ship these (same reasoning as runeTreeIconUrl in lib/ddragon.ts).
export function roleIconUrl(role: Role): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/svg/position-${ROLE_ICON_KEYS[role]}.svg`
}

// Same "Fill" queue icon shown in the client's role picker, from a different plugin bundle
// than the individual position icons above.
export const FILL_ICON_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-fill.png'

export function emptyLoadout(roles: Role[] = []): Loadout {
  return { id: newId(), roles, runePages: [], items: emptyBuildItems(), itemExclusions: [] }
}

export function loadoutLabel(loadout: Loadout): string {
  if (loadout.roles.length === 0) return 'Fill'
  return ROLES.filter((r) => loadout.roles.includes(r))
    .map((r) => ROLE_LABELS[r])
    .join(', ')
}

// Union of every loadout's roles, in canonical ROLES order — used for card badges and the
// collection role filter.
export function buildRoles(build: Build): Role[] {
  const present = new Set(build.loadouts.flatMap((l) => l.roles))
  return ROLES.filter((r) => present.has(r))
}

// The id of whichever loadout currently owns a role, if any — used to grey out that role's
// checkbox on every other loadout, since a role can only live in one loadout at a time.
export function roleOwnerLoadoutId(build: Build, role: Role): string | undefined {
  return build.loadouts.find((l) => l.roles.includes(role))?.id
}

// If reassigning a role stripped it from its previous owner and left that loadout with no
// roles at all, drop it (its content discarded) — but only that loadout, never an unrelated
// loadout that was already role-less (e.g. an intentional "Fill" variant).
function pruneEmptyLoadouts(loadouts: Loadout[], emptiedLoadoutId?: string): Loadout[] {
  if (loadouts.length <= 1 || !emptiedLoadoutId) return loadouts
  const emptied = loadouts.find((l) => l.id === emptiedLoadoutId)
  if (!emptied || emptied.roles.length > 0) return loadouts
  return loadouts.filter((l) => l.id !== emptiedLoadoutId)
}

// Each role can belong to at most one loadout at a time: checking it here removes it from
// wherever it currently lives first, unchecking just removes it from the target loadout.
export function assignRole(build: Build, loadoutId: string, role: Role, checked: boolean): Build {
  const previousOwnerId = roleOwnerLoadoutId(build, role)
  let loadouts = build.loadouts.map((l) => ({ ...l, roles: l.roles.filter((r) => r !== role) }))
  if (checked) {
    loadouts = loadouts.map((l) => (l.id === loadoutId ? { ...l, roles: [...l.roles, role] } : l))
  }
  return { ...build, loadouts: pruneEmptyLoadouts(loadouts, previousOwnerId) }
}

// "+ New variant": clones a loadout's rune/item content into a new roles-less loadout, ready
// for the user to pull roles into it via assignRole.
export function splitLoadout(build: Build, loadoutId: string): { build: Build; newLoadoutId: string } {
  const source = build.loadouts.find((l) => l.id === loadoutId)
  const clone: Loadout = source
    ? { ...emptyLoadout(), runePages: source.runePages, items: source.items, itemExclusions: source.itemExclusions }
    : emptyLoadout()
  return { build: { ...build, loadouts: [...build.loadouts, clone] }, newLoadoutId: clone.id }
}

export function removeLoadout(build: Build, loadoutId: string): Build {
  if (build.loadouts.length <= 1) return build
  return { ...build, loadouts: build.loadouts.filter((l) => l.id !== loadoutId) }
}
