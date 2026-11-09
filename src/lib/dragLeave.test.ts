import { describe, expect, it } from 'vitest'
import { dragLeftElement } from './dragLeave'

const child = {} as unknown as Node & EventTarget
const outside = {} as unknown as Node & EventTarget
const currentTarget = { contains: (other: Node | null) => other === child }

describe('dragLeftElement', () => {
  it('ignores moves onto one of the element\'s own children', () => {
    expect(dragLeftElement({ currentTarget, relatedTarget: child })).toBe(false)
  })

  it('counts moves onto something outside the element', () => {
    expect(dragLeftElement({ currentTarget, relatedTarget: outside })).toBe(true)
  })

  it('counts the pointer leaving the window', () => {
    expect(dragLeftElement({ currentTarget, relatedTarget: null })).toBe(true)
  })
})
