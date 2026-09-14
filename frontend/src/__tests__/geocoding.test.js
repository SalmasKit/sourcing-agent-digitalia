import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatLocationLabel, searchLocations } from '../utils/geocoding.js'

// Mock fetch
global.fetch = vi.fn()

describe('geocoding.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatLocationLabel', () => {
    it('should return empty string for null input', () => {
      expect(formatLocationLabel(null)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      expect(formatLocationLabel(undefined)).toBe('')
    })

    it('should format city, region, country', () => {
      const item = {
        address: {
          city: 'Casablanca',
          state: 'Casablanca-Settat',
          country: 'Morocco',
        },
      }
      expect(formatLocationLabel(item)).toBe('Casablanca, Casablanca-Settat, Morocco')
    })

    it('should use town when city not available', () => {
      const item = {
        address: {
          town: 'Marrakech',
          country: 'Morocco',
        },
      }
      expect(formatLocationLabel(item)).toBe('Marrakech, Morocco')
    })

    it('should use village when city/town not available', () => {
      const item = {
        address: {
          village: 'Small Town',
          country: 'Morocco',
        },
      }
      expect(formatLocationLabel(item)).toBe('Small Town, Morocco')
    })

    it('should use municipality when city/town/village not available', () => {
      const item = {
        address: {
          municipality: 'Rabat',
          country: 'Morocco',
        },
      }
      expect(formatLocationLabel(item)).toBe('Rabat, Morocco')
    })

    it('should use state_district when other fields not available', () => {
      const item = {
        address: {
          state_district: 'District',
          country: 'Morocco',
        },
      }
      expect(formatLocationLabel(item)).toBe('District, Morocco')
    })

    it('should use county when other fields not available', () => {
      const item = {
        address: {
          county: 'County',
          country: 'Morocco',
        },
      }
      expect(formatLocationLabel(item)).toBe('County, Morocco')
    })

    it('should use item.name when address fields not available', () => {
      const item = {
        name: 'Location Name',
        address: {},
      }
      expect(formatLocationLabel(item)).toBe('Location Name')
    })

    it('should use region when available', () => {
      const item = {
        address: {
          region: 'Region Name',
          country: 'Morocco',
        },
      }
      expect(formatLocationLabel(item)).toBe('Region Name, Morocco')
    })

    it('should deduplicate identical values', () => {
      const item = {
        address: {
          city: 'Casablanca',
          state: 'Casablanca',
          country: 'Casablanca',
        },
      }
      expect(formatLocationLabel(item)).toBe('Casablanca')
    })

    it('should fallback to display_name when structured fields sparse', () => {
      const item = {
        display_name: '123 Main St, City, Country',
        address: {},
      }
      const result = formatLocationLabel(item)
      expect(result).toContain('Main St')
      expect(result).toContain('City')
      expect(result).toContain('Country')
    })

    it('should filter out numeric-only parts from display_name', () => {
      const item = {
        display_name: '12345, City, Country',
        address: {},
      }
      expect(formatLocationLabel(item)).toBe('City, Country')
    })

    it('should limit display_name fallback to 3 parts', () => {
      const item = {
        display_name: 'Part1, Part2, Part3, Part4, Part5',
        address: {},
      }
      expect(formatLocationLabel(item)).toBe('Part1, Part2, Part3')
    })

    it('should handle empty address object', () => {
      const item = {
        address: {},
        display_name: 'Location',
      }
      expect(formatLocationLabel(item)).toBe('Location')
    })
  })

  describe('searchLocations', () => {
    it('should return empty array for short query', async () => {
      const result = await searchLocations('a')
      expect(result).toEqual([])
    })

    it('should return empty array for empty query', async () => {
      const result = await searchLocations('')
      expect(result).toEqual([])
    })

    it('should return empty array for null query', async () => {
      const result = await searchLocations(null)
      expect(result).toEqual([])
    })

    it('should fetch locations from Nominatim API', async () => {
      const mockResponse = [
        {
          display_name: 'Casablanca, Morocco',
          address: { city: 'Casablanca', country: 'Morocco' },
          class: 'place',
        },
      ]
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await searchLocations('Casablanca')
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Casablanca, Morocco')
    })

    it('should handle API error gracefully', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
      })

      const result = await searchLocations('Casablanca')
      expect(result).toEqual([])
    })

    it('should handle network error gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'))

      const result = await searchLocations('Casablanca')
      expect(result).toEqual([])
    })

    it('should prioritize place and boundary results', async () => {
      const mockResponse = [
        {
          display_name: 'Road Name',
          address: { road: 'Road' },
          class: 'highway',
        },
        {
          display_name: 'City Name',
          address: { city: 'City', country: 'Morocco' },
          class: 'place',
        },
      ]
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await searchLocations('test')
      expect(result[0].label).toContain('City')
    })

    it('should deduplicate results by label', async () => {
      const mockResponse = [
        {
          display_name: 'Casablanca, Morocco',
          address: { city: 'Casablanca', country: 'Morocco' },
          class: 'place',
        },
        {
          display_name: 'Casablanca, Morocco (different)',
          address: { city: 'Casablanca', country: 'Morocco' },
          class: 'boundary',
        },
      ]
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await searchLocations('Casablanca')
      expect(result).toHaveLength(1)
    })

    it('should limit results to 5', async () => {
      const mockResponse = Array.from({ length: 10 }, (_, i) => ({
        display_name: `Location ${i}`,
        address: { city: `City ${i}`, country: 'Morocco' },
        class: 'place',
      }))
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await searchLocations('test')
      expect(result).toHaveLength(5)
    })

    it('should pass language header', async () => {
      const mockResponse = []
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      await searchLocations('test', 'fr')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept-Language': 'fr',
          }),
        })
      )
    })

    it('should trim query before checking length', async () => {
      const result = await searchLocations('  a  ')
      expect(result).toEqual([])
    })

    it('should include fullLabel in results', async () => {
      const mockResponse = [
        {
          display_name: 'Casablanca, Morocco',
          address: { city: 'Casablanca', country: 'Morocco' },
          class: 'place',
        },
      ]
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await searchLocations('Casablanca')
      expect(result[0].fullLabel).toBe('Casablanca, Morocco')
    })
  })
})
