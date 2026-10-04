import { describe, expect, it } from 'vitest'
import { formatNumber, perRank } from './spellCalc'

describe('perRank', () => {
  it('indexes 7-entry DataValues by rank (index 0 = unlearned)', () => {
    expect(perRank([0, 10, 20, 30, 40, 50, 60], 1)).toBe(10)
    expect(perRank([0, 10, 20, 30, 40, 50, 60], 5)).toBe(50)
  })

  it('indexes 6-entry arrays from rank 1', () => {
    expect(perRank([10, 20, 30, 40, 50, 60], 1)).toBe(10)
  })

  it('clamps out-of-range ranks', () => {
    expect(perRank([10, 20, 30], 9)).toBe(30)
    expect(perRank([10, 20, 30], 0)).toBe(10)
  })

  it('returns undefined for no values', () => {
    expect(perRank([], 1)).toBeUndefined()
  })
})

describe('formatNumber', () => {
  it('rounds values of 10 and above to whole numbers', () => {
    expect(formatNumber(123.456)).toBe('123')
  })

  it('keeps two decimals below 10', () => {
    expect(formatNumber(1.23456)).toBe('1.23')
    expect(formatNumber(4)).toBe('4')
  })

  it('shows ? for non-finite values', () => {
    expect(formatNumber(NaN)).toBe('?')
    expect(formatNumber(Infinity)).toBe('?')
  })
})
