import { describe, it, expect } from 'vitest'

describe('Utils', () => {
  describe('General utility functions', () => {
    it('should handle basic string operations', () => {
      const testString = 'Hello World'
      expect(testString.toLowerCase()).toBe('hello world')
      expect(testString.toUpperCase()).toBe('HELLO WORLD')
    })

    it('should handle array operations', () => {
      const testArray = [1, 2, 3, 4, 5]
      expect(testArray.filter(x => x > 2)).toEqual([3, 4, 5])
      expect(testArray.map(x => x * 2)).toEqual([2, 4, 6, 8, 10])
    })

    it('should handle object operations', () => {
      const testObj = { name: 'John', age: 30 }
      expect(Object.keys(testObj)).toEqual(['name', 'age'])
      expect(Object.values(testObj)).toEqual(['John', 30])
    })

    it('should handle number operations', () => {
      expect(Number.isNaN(NaN)).toBe(true)
      expect(Number.isNaN(123)).toBe(false)
      expect(Number.parseInt('42', 10)).toBe(42)
    })

    it('should handle boolean operations', () => {
      expect(true && false).toBe(false)
      expect(true || false).toBe(true)
      expect(!true).toBe(false)
    })

    it('should handle null/undefined checks', () => {
      expect(null === null).toBe(true)
      expect(undefined === undefined).toBe(true)
      expect(null === undefined).toBe(false)
    })
  })
})
