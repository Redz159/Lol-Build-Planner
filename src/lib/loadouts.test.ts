import { describe, expect, it } from 'vitest'
import type { Build, Loadout, Role } from '../types/build'
import { assignRole, buildRoles, emptyLoadout, loadoutLabel, removeLoadout, splitLoadout, visibleItemSlots } from './loadouts'
import { DEFAULT_ITEM_SLOTS } from '../types/items'

function makeBuild(...roleSets: Role[][]): Build {
  return {
    id: 'b',
    champion: { id: 'Ahri', name: 'Ahri' },
    title: 'Test',
    loadouts: roleSets.map((roles) => emptyLoadout(roles)),
    favorite: false,
    createdAt: '',
    updatedAt: '',
  }
}

const rolesOf = (build: Build) => build.loadouts.map((l) => l.roles)

describe('assignRole', () => {
  it('moves a role from its previous owner', () => {
    const build = makeBuild(['top', 'mid'], ['jungle'])
    const next = assignRole(build, build.loadouts[1].id, 'mid', true)
    expect(rolesOf(next)).toEqual([['top'], ['jungle', 'mid']])
  })

  it('drops the previous owner when it is left with no roles', () => {
    const build = makeBuild(['top'], ['jungle'])
    const next = assignRole(build, build.loadouts[1].id, 'top', true)
    expect(rolesOf(next)).toEqual([['jungle', 'top']])
  })

  // Regression (d2175d8): an intentional role-less "Fill" variant was deleted whenever a role
  // was assigned to some other loadout.
  it('keeps an unrelated Fill loadout', () => {
    const build = makeBuild(['top'], [])
    const next = assignRole(build, build.loadouts[0].id, 'mid', true)
    expect(rolesOf(next)).toEqual([['top', 'mid'], []])
  })

  it('unchecking only removes the role from the target', () => {
    const build = makeBuild(['top', 'mid'], ['jungle'])
    const next = assignRole(build, build.loadouts[0].id, 'mid', false)
    expect(rolesOf(next)).toEqual([['top'], ['jungle']])
  })

  it('never removes the last loadout', () => {
    const build = makeBuild(['top'])
    const next = assignRole(build, build.loadouts[0].id, 'top', false)
    expect(rolesOf(next)).toEqual([[]])
  })
})

describe('splitLoadout', () => {
  it('adds a role-less copy of the source content', () => {
    const build = makeBuild(['top'])
    const source: Loadout = { ...build.loadouts[0], itemSlots: DEFAULT_ITEM_SLOTS, skillOrderNote: 'note' }
    const { build: next, newLoadoutId } = splitLoadout({ ...build, loadouts: [source] }, source.id)
    const clone = next.loadouts.find((l) => l.id === newLoadoutId)!
    expect(next.loadouts).toHaveLength(2)
    expect(clone.id).not.toBe(source.id)
    expect(clone.roles).toEqual([])
    expect(clone.itemSlots).toEqual(source.itemSlots)
    expect(clone.skillOrderNote).toBe('note')
  })
})

describe('removeLoadout', () => {
  it('removes the given loadout', () => {
    const build = makeBuild(['top'], ['mid'])
    expect(rolesOf(removeLoadout(build, build.loadouts[0].id))).toEqual([['mid']])
  })

  it('keeps the only loadout', () => {
    const build = makeBuild(['top'])
    expect(removeLoadout(build, build.loadouts[0].id)).toBe(build)
  })
})

describe('labels and roles', () => {
  it('labels a role-less loadout Fill and orders roles canonically', () => {
    expect(loadoutLabel(emptyLoadout())).toBe('Fill')
    expect(loadoutLabel(emptyLoadout(['support', 'top']))).toBe('Top, Support')
  })

  it('collects every loadout role in canonical order', () => {
    expect(buildRoles(makeBuild(['support'], ['top', 'mid']))).toEqual(['top', 'mid', 'support'])
  })

  it('hides the ADC bonus slot unless the loadout has ADC', () => {
    expect(visibleItemSlots(DEFAULT_ITEM_SLOTS, ['mid']).map((s) => s.id)).not.toContain('item6')
    expect(visibleItemSlots(DEFAULT_ITEM_SLOTS, ['adc']).map((s) => s.id)).toContain('item6')
  })
})
