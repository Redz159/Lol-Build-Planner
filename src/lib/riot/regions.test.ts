import { describe, expect, it } from 'vitest'
import { matchHostForPlatform } from './regions'

describe('matchHostForPlatform', () => {
  it('maps platforms to their match-v5 routing host', () => {
    expect(matchHostForPlatform('euw1')).toBe('europe.api.riotgames.com')
    expect(matchHostForPlatform('na1')).toBe('americas.api.riotgames.com')
    expect(matchHostForPlatform('kr')).toBe('asia.api.riotgames.com')
    expect(matchHostForPlatform('oc1')).toBe('sea.api.riotgames.com')
  })

  it('ignores case', () => {
    expect(matchHostForPlatform('EUW1')).toBe('europe.api.riotgames.com')
  })

  it('throws for an unknown platform', () => {
    expect(() => matchHostForPlatform('xx9')).toThrow(/xx9/)
  })
})
