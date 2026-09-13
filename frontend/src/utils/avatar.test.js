import { describe, it, expect } from 'vitest'
import { getAvatarUrl } from './avatar.js'

describe('avatar.js', () => {
  describe('getAvatarUrl', () => {
    it('should return provided avatar URL if valid', () => {
      const validUrl = 'https://example.com/avatar.jpg'
      expect(getAvatarUrl('John Doe', validUrl)).toBe(validUrl)
    })

    it('should reject lego stock photos', () => {
      const legoUrl = 'https://example.com/lego-avatar.jpg'
      expect(getAvatarUrl('John Doe', legoUrl)).not.toBe(legoUrl)
    })

    it('should reject randomuser.me URLs', () => {
      const randomUserUrl = 'https://randomuser.me/api/portraits/men/1.jpg'
      expect(getAvatarUrl('John Doe', randomUserUrl)).not.toBe(randomUserUrl)
    })

    it('should generate initials from full name with two parts', () => {
      const result = getAvatarUrl('John Doe', null)
      expect(result).toContain('JD')
    })

    it('should generate initials from single name', () => {
      const result = getAvatarUrl('John', null)
      expect(result).toContain('JO')
    })

    it('should handle empty name', () => {
      const result = getAvatarUrl('', null)
      expect(result).toContain('C')
    })

    it('should handle null name', () => {
      const result = getAvatarUrl(null, null)
      expect(result).toContain('C')
    })

    it('should handle name with multiple spaces', () => {
      const result = getAvatarUrl('John   Middle   Doe', null)
      expect(result).toContain('JD')
    })

    it('should generate SVG data URI', () => {
      const result = getAvatarUrl('John Doe', null)
      expect(result).toMatch(/^data:image\/svg\+xml;/)
    })

    it('should trim whitespace from name', () => {
      const result1 = getAvatarUrl('  John Doe  ', null)
      const result2 = getAvatarUrl('John Doe', null)
      expect(result1).toBe(result2)
    })

    it('should use brand colors from palette', () => {
      const result = getAvatarUrl('Test User', null)
      const colors = ['#0E7C8C', '#0A5C68', '#278F5E', '#1F6E4A', '#B4650F', '#38414F']
      // Check if any of the brand colors (possibly URL-encoded) is in the result
      const hasBrandColor = colors.some(color => 
        result.includes(color) || result.includes(encodeURIComponent(color))
      )
      expect(hasBrandColor).toBe(true)
    })

    it('should be deterministic for same name', () => {
      const result1 = getAvatarUrl('John Doe', null)
      const result2 = getAvatarUrl('John Doe', null)
      expect(result1).toBe(result2)
    })

    it('should handle non-string avatarUrl', () => {
      const result = getAvatarUrl('John Doe', 123)
      expect(result).toContain('JD')
    })

    it('should handle avatarUrl without http', () => {
      const result = getAvatarUrl('John Doe', 'avatar.jpg')
      expect(result).toContain('JD')
    })
  })
})
