import { describe, expect, it } from 'vitest'
import { addStatIconsToDescription, statIconUrl } from './statIcons'

const icon = (file: string) => `<img class="tooltip-stat-icon" src="${statIconUrl(file)}" alt="">`

describe('addStatIconsToDescription', () => {
  it('puts the matching icon in front of each stat line', () => {
    const description =
      '<mainText><stats><attention>75</attention> Attack Damage<br><attention>25%</attention> Critical Strike Chance</stats><br><br>Passive</mainText>'
    expect(addStatIconsToDescription(description)).toBe(
      `<mainText><stats>${icon('statsicon/scalead')}<attention>75</attention> Attack Damage<br>${icon('statsicon/scalecrit')}<attention>25%</attention> Critical Strike Chance</stats><br><br>Passive</mainText>`,
    )
  })

  it('leaves unknown stat lines and text outside <stats> alone', () => {
    const description = '<stats><attention>3</attention> Something New</stats><br>50 Attack Damage'
    expect(addStatIconsToDescription(description)).toBe(description)
  })
})
