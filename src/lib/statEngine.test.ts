import { describe, expect, it } from 'vitest'
import type { DDragonItem } from '../types/ddragon'
import type { ChampionSimData, TargetStats } from '../types/simulator'
import { computeStats, effectiveResist, mitigate, resistMultiplier, softCapMoveSpeed, statAtLevel } from './statEngine'

// Ahri's base stats from public/data/champions/Ahri.json (patch 16.17).
const ahri = {
  id: 'Ahri',
  stats: {
    hp: 590,
    hpPerLevel: 104,
    hpRegen: 0.5,
    hpRegenPerLevel: 0.12,
    resourceType: 0,
    resource: 418,
    resourcePerLevel: 25,
    resourceRegen: 1.6,
    resourceRegenPerLevel: 0.16,
    ad: 53,
    adPerLevel: 3,
    armor: 21,
    armorPerLevel: 4.2,
    mr: 30,
    mrPerLevel: 1.3,
    attackSpeed: 0.668,
    attackSpeedRatio: 0.625,
    attackSpeedPerLevel: 2.2,
    moveSpeed: 330,
    range: 550,
    critDamageMultiplier: 2,
    adaptiveApWeight: 1,
  },
  passive: {},
  spells: [],
} as unknown as ChampionSimData

const noRunes = { runeIds: [], shardIds: [], inputs: {} }
const runeInfo = () => undefined

function item(id: string, name: string, stats: string): DDragonItem {
  return { id, name, description: `<mainText><stats>${stats}</stats></mainText>`, image: { full: `${id}.png` }, tags: [], gold: { total: 0 }, into: [], stats: {} }
}

describe('statAtLevel', () => {
  it('is the base value at level 1', () => {
    expect(statAtLevel(590, 104, 1)).toBe(590)
  })

  it('reaches base + 17 × growth at level 18', () => {
    expect(statAtLevel(590, 104, 18)).toBeCloseTo(590 + 17 * 104)
  })

  it('grows a little more each level', () => {
    const gains = [2, 3, 4].map((l) => statAtLevel(0, 10, l) - statAtLevel(0, 10, l - 1))
    expect(gains[1]).toBeGreaterThan(gains[0])
    expect(gains[2]).toBeGreaterThan(gains[1])
  })
})

describe('softCapMoveSpeed', () => {
  it('leaves speeds between 220 and 415 alone', () => {
    expect(softCapMoveSpeed(220)).toBe(220)
    expect(softCapMoveSpeed(345)).toBe(345)
    expect(softCapMoveSpeed(415)).toBe(415)
  })

  it('joins the bands up continuously', () => {
    expect(softCapMoveSpeed(415.0001)).toBeCloseTo(415, 3)
    expect(softCapMoveSpeed(490)).toBeCloseTo(475)
    expect(softCapMoveSpeed(490.0001)).toBeCloseTo(475, 3)
  })

  it('halves speed below 220', () => {
    expect(softCapMoveSpeed(200)).toBe(210)
  })
})

describe('resistMultiplier', () => {
  it('takes full damage at 0 resist', () => {
    expect(resistMultiplier(0)).toBe(1)
  })

  it('halves damage at 100 resist', () => {
    expect(resistMultiplier(100)).toBe(0.5)
  })

  it('amplifies damage at negative resist', () => {
    expect(resistMultiplier(-100)).toBe(1.5)
  })
})

describe('computeStats', () => {
  it('returns base stats with no items or runes', () => {
    const block = computeStats({ champ: ahri, level: 1, items: [], runes: noRunes, runeInfo })
    expect(block.stats.hp.total).toBe(590)
    expect(block.stats.ad.total).toBe(53)
    expect(block.stats.armor.total).toBe(21)
    expect(block.stats.ms.total).toBe(330)
    expect(block.stats.as.total).toBeCloseTo(0.668)
  })

  it('scales base stats with level', () => {
    const block = computeStats({ champ: ahri, level: 18, items: [], runes: noRunes, runeInfo })
    expect(block.stats.hp.base).toBeCloseTo(590 + 17 * 104)
    expect(block.stats.hp.bonus).toBe(0)
  })

  it('adds item stats parsed from the tooltip as bonus', () => {
    const sword = item('1036', 'Long Sword', '<attention>10</attention> Attack Damage')
    const block = computeStats({ champ: ahri, level: 1, items: [sword], runes: noRunes, runeInfo })
    expect(block.stats.ad.bonus).toBe(10)
    expect(block.stats.ad.total).toBe(63)
  })

  it('applies bonus attack speed through the champion ratio', () => {
    const dagger = item('1042', 'Dagger', '<attention>10%</attention> Attack Speed')
    const block = computeStats({ champ: ahri, level: 1, items: [dagger], runes: noRunes, runeInfo })
    expect(block.stats.as.total).toBeCloseTo(0.668 + 0.625 * 0.1)
  })

  it('picks the adaptive type from bonus AD vs AP, falling back to the champion default', () => {
    expect(computeStats({ champ: ahri, level: 1, items: [], runes: noRunes, runeInfo }).adaptive).toBe('ap')
    const sword = item('1036', 'Long Sword', '<attention>10</attention> Attack Damage')
    expect(computeStats({ champ: ahri, level: 1, items: [sword], runes: noRunes, runeInfo }).adaptive).toBe('ad')
  })
})

describe('mitigation', () => {
  const attacker = (pen: { armorPen?: number; lethality?: number }) => {
    const items = [
      ...(pen.lethality ? [item(`lethality-${pen.lethality}`, 'Lethal', `<attention>${pen.lethality}</attention> Lethality`)] : []),
      ...(pen.armorPen ? [item(`armorpen-${pen.armorPen}`, 'Pen', `<attention>${pen.armorPen}%</attention> Armor Penetration`)] : []),
    ]
    return computeStats({ champ: ahri, level: 1, items, runes: noRunes, runeInfo })
  }
  const target: TargetStats = { hp: 1000, armor: 100, bonusArmor: 0, mr: 50, bonusMr: 0 }

  it('applies percent penetration before flat', () => {
    expect(effectiveResist('physical', attacker({ armorPen: 30, lethality: 10 }), target)).toBeCloseTo(60)
  })

  it('never pushes resist below 0', () => {
    expect(effectiveResist('physical', attacker({ lethality: 500 }), target)).toBe(0)
  })

  it('leaves true damage unmitigated', () => {
    expect(mitigate(100, 'true', attacker({}), target)).toBe(100)
    expect(mitigate(100, 'physical', attacker({}), target)).toBe(50)
  })
})
