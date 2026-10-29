import { describe, expect, it } from 'vitest'
import type { ExampleBuild } from '../types/build'
import type { DDragonItem } from '../types/ddragon'
import { exampleBuildFinalItems } from './simulatorLoadout'

const item = (id: string, into: string[] = []): DDragonItem => ({
  id,
  name: id,
  description: '',
  image: { full: '' },
  tags: [],
  gold: { total: 0 },
  into,
  stats: {},
})

// Starter that upgrades, a component, boots that still upgrade, and five finished items.
const allItems = [item('starter', ['next']), item('comp', ['x']), item('boots', ['t3']), ...['a', 'b', 'c', 'd', 'e', 'f'].map((id) => item(id))]
const place = (itemId: string) => [{ id: `p-${itemId}`, itemId }]
const build: ExampleBuild = {
  id: 'e',
  label: 'Ex',
  items: {
    starter: place('starter'),
    early: place('comp'),
    boots: place('boots'),
    item1: place('a'),
    item2: place('b'),
    item3: place('c'),
    item4: place('d'),
    item5: place('e'),
    item6: place('f'),
  },
}

describe('exampleBuildFinalItems', () => {
  it('always keeps the boots, even when they still upgrade, and skips the starter and components', () => {
    expect(exampleBuildFinalItems(build, allItems, ['mid'])).toEqual(['boots', 'a', 'b', 'c', 'd', 'e'])
  })

  it('keeps the starter item for supports', () => {
    expect(exampleBuildFinalItems(build, allItems, ['support'])).toEqual(['starter', 'boots', 'a', 'b', 'c', 'd'])
  })
})
