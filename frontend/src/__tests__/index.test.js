import { describe, it, expect } from 'vitest'
import { getAvatarUrl } from '../utils/avatar.js'
import { formatLocationLabel } from '../utils/geocoding.js'

/**
 * index.test.js — cross-utility sanity tests
 *
 * Tests real behaviour from both utility modules.
 * Avoids constant-expression patterns (Sonar S2583, S2589, S1764, S2817).
 */

describe('Utils — avatar + geocoding integration', () => {

  // ── getAvatarUrl safe-input guards ─────────────────────────────────────
  describe('getAvatarUrl', () => {
    it('generates a data URI when no URL is supplied', () => {
      const result = getAvatarUrl('Alice Martin', null)
      expect(result.startsWith('data:image/svg+xml')).toBe(true)
    })

    it('returns the original URL for a plain https avatar', () => {
      const url = 'https://cdn.example.com/photo.jpg'
      expect(getAvatarUrl('Bob', url)).toBe(url)
    })

    it('rejects lego stock-photo URLs and falls back to SVG', () => {
      const url = 'https://cdn.example.com/lego-face.jpg'
      const result = getAvatarUrl('Bob', url)
      expect(result.startsWith('data:image/svg+xml')).toBe(true)
    })

    it('rejects randomuser.me URLs', () => {
      const url = 'https://randomuser.me/api/portraits/men/5.jpg'
      const result = getAvatarUrl('Bob', url)
      expect(result).not.toBe(url)
    })

    it('is deterministic: same name always yields same output', () => {
      const a = getAvatarUrl('Claire Dupont', null)
      const b = getAvatarUrl('Claire Dupont', null)
      expect(a).toBe(b)
    })

    it('produces different outputs for different names', () => {
      const a = getAvatarUrl('Alice', null)
      const b = getAvatarUrl('Zara', null)
      expect(a).not.toBe(b)
    })

    it('falls back to "C" initials for empty name', () => {
      const result = getAvatarUrl('', null)
      expect(result).toContain('C')
    })

    it('falls back gracefully for null name', () => {
      const result = getAvatarUrl(null, null)
      expect(result.startsWith('data:image/svg+xml')).toBe(true)
    })
  })

  // ── formatLocationLabel correctness ────────────────────────────────────
  describe('formatLocationLabel', () => {
    it('returns empty string for null input', () => {
      expect(formatLocationLabel(null)).toBe('')
    })

    it('returns empty string for undefined input', () => {
      expect(formatLocationLabel(undefined)).toBe('')
    })

    it('formats city + country', () => {
      const item = { address: { city: 'Casablanca', country: 'Morocco' } }
      expect(formatLocationLabel(item)).toBe('Casablanca, Morocco')
    })

    it('formats city + region + country', () => {
      const item = {
        address: { city: 'Rabat', state: 'Rabat-Salé', country: 'Morocco' },
      }
      expect(formatLocationLabel(item)).toBe('Rabat, Rabat-Salé, Morocco')
    })

    it('deduplicates identical city and region', () => {
      const item = {
        address: { city: 'Rabat', state: 'Rabat', country: 'France' },
      }
      const result = formatLocationLabel(item)
      // "Rabat" should not appear twice
      expect(result.split('Rabat').length - 1).toBe(1)
    })

    it('falls back to display_name when address is sparse', () => {
      const item = {
        address: {},
        display_name: 'Marrakech, Morocco',
      }
      const result = formatLocationLabel(item)
      expect(result).toContain('Marrakech')
    })

    it('filters out numeric-only parts from display_name fallback', () => {
      const item = {
        address: {},
        display_name: '40000, Marrakech, Morocco',
      }
      const result = formatLocationLabel(item)
      expect(result).not.toContain('40000')
      expect(result).toContain('Marrakech')
    })
  })

  // ── Number / NaN utilities — using Number.NaN (Sonar S2814) ────────────
  describe('Number utilities (Sonar-compliant)', () => {
    it('Number.isNaN identifies NaN correctly', () => {
      const val = Number.NaN
      expect(Number.isNaN(val)).toBe(true)
    })

    it('Number.isNaN does not coerce strings', () => {
      expect(Number.isNaN('text')).toBe(false)
    })

    it('Number.parseInt converts numeric strings with radix', () => {
      const parsed = Number.parseInt('42', 10)
      expect(parsed).toBe(42)
    })

    it('Number.parseInt returns NaN for non-numeric strings', () => {
      const parsed = Number.parseInt('abc', 10)
      expect(Number.isNaN(parsed)).toBe(true)
    })
  })
})
