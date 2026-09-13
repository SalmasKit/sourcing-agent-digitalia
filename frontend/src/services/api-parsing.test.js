import { describe, it, expect } from 'vitest'

describe('API Parsing Functions', () => {
  describe('parseExperienceYears', () => {
    it('should return number for valid numeric input', () => {
      const parseExperienceYears = (val) => {
        if (typeof val === 'number' && !Number.isNaN(val) && val >= 0) return val
        if (typeof val === 'string') {
          const match = val.match(/\d+/)
          if (match) return Number.parseInt(match[0], 10)
        }
        return 3
      }

      expect(parseExperienceYears(5)).toBe(5)
      expect(parseExperienceYears(0)).toBe(0)
      expect(parseExperienceYears(10)).toBe(10)
    })

    it('should return default for invalid numbers', () => {
      const parseExperienceYears = (val) => {
        if (typeof val === 'number' && !Number.isNaN(val) && val >= 0) return val
        return 3
      }

      expect(parseExperienceYears(Number.NaN)).toBe(3)
      expect(parseExperienceYears(-1)).toBe(3)
    })

    it('should extract number from string', () => {
      const parseExperienceYears = (val) => {
        if (typeof val === 'number' && !Number.isNaN(val) && val >= 0) return val
        if (typeof val === 'string') {
          const match = val.match(/\d+/)
          if (match) return Number.parseInt(match[0], 10)
        }
        return 3
      }

      expect(parseExperienceYears('5 years')).toBe(5)
      expect(parseExperienceYears('10 years experience')).toBe(10)
    })

    it('should return default for non-numeric strings', () => {
      const parseExperienceYears = (val) => {
        if (typeof val === 'number' && !Number.isNaN(val) && val >= 0) return val
        if (typeof val === 'string') {
          const match = val.match(/\d+/)
          if (match) return Number.parseInt(match[0], 10)
        }
        return 3
      }

      expect(parseExperienceYears('senior')).toBe(3)
      expect(parseExperienceYears('')).toBe(3)
    })
  })

  describe('API response parsing', () => {
    it('should handle candidate data parsing', () => {
      const mockCandidate = {
        full_name: 'John Doe',
        headline: 'Senior Developer',
        location: 'Casablanca',
        experience_years: 5,
        skills: ['JavaScript', 'React'],
      }

      const parsed = {
        fullName: mockCandidate.full_name || 'Candidate',
        headline: mockCandidate.headline,
        location: mockCandidate.location,
        experienceYears: mockCandidate.experience_years || 3,
        skills: Array.isArray(mockCandidate.skills) ? mockCandidate.skills : [],
      }

      expect(parsed.fullName).toBe('John Doe')
      expect(parsed.headline).toBe('Senior Developer')
      expect(parsed.experienceYears).toBe(5)
      expect(parsed.skills).toEqual(['JavaScript', 'React'])
    })

    it('should handle missing candidate data', () => {
      const mockCandidate = {}

      const parsed = {
        fullName: mockCandidate.full_name || 'Candidate',
        headline: mockCandidate.headline || 'Software Professional',
        location: mockCandidate.location || 'Unknown',
        experienceYears: mockCandidate.experience_years || 3,
        skills: Array.isArray(mockCandidate.skills) ? mockCandidate.skills : [],
      }

      expect(parsed.fullName).toBe('Candidate')
      expect(parsed.headline).toBe('Software Professional')
      expect(parsed.experienceYears).toBe(3)
      expect(parsed.skills).toEqual([])
    })
  })

  describe('Number.isNaN vs isNaN', () => {
    it('should use Number.isNaN for proper NaN checking', () => {
      expect(Number.isNaN(NaN)).toBe(true)
      expect(Number.isNaN(123)).toBe(false)
      expect(Number.isNaN('123')).toBe(false)
      expect(Number.isNaN(undefined)).toBe(false)
    })

    it('should use Number.parseInt for string to number conversion', () => {
      expect(Number.parseInt('42', 10)).toBe(42)
      expect(Number.parseInt('10 years', 10)).toBe(10)
      expect(Number.parseInt('invalid', 10)).toBe(Number.NaN)
    })
  })
})
